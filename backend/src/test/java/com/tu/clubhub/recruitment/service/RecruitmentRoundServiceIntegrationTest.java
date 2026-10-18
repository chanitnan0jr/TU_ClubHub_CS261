package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_test}",
        "spring.datasource.username=postgres",
        "spring.datasource.password=${DB_PASSWORD}",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.session.jdbc.initialize-schema=never",
        "tu.auth.mode=mock"
})
@ActiveProfiles("test")
@Transactional
class RecruitmentRoundServiceIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private RecruitmentRoundService service;

    @Autowired
    private Clock clock;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void closingRoundPreservesApplicationAnswersAndHistory() {
        String suffix = UUID.randomUUID().toString();

        OffsetDateTime now =
                clock.instant().atOffset(ZoneOffset.UTC);

        Long committeeId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test committee')
                RETURNING id
                """, Long.class, "committee-" + suffix);

        Long studentId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test student')
                RETURNING id
                """, Long.class, "student-" + suffix);

        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code)
                VALUES (?, ?)
                """, committeeId, "C-" + suffix.substring(0, 16));

        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code)
                VALUES (?, ?)
                """, studentId, "S-" + suffix.substring(0, 16));

        Long categoryId = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?)
                RETURNING id
                """, Long.class, "category-" + suffix);

        Long clubId = jdbc.queryForObject("""
                INSERT INTO clubs
                    (category_id, name, description, created_by)
                VALUES (?, ?, 'Test club', ?)
                RETURNING id
                """, Long.class,
                categoryId,
                "club-" + suffix,
                committeeId);

        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships
                    (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?)
                RETURNING id
                """, Long.class,
                clubId,
                committeeId,
                now.minusDays(1));

        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role,
                     starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?)
                """,
                membershipId,
                now.minusDays(1),
                now.plusDays(1),
                committeeId);

        Long roundId = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status,
                     published_at, created_by)
                VALUES (?, 'Test round', 2569, 1,
                        'Description', ?, ?, ?, 'PUBLISHED', ?, ?)
                RETURNING id
                """, Long.class,
                clubId,
                now.minusHours(1),
                now.plusHours(1),
                now.plusDays(1),
                now.minusHours(2),
                committeeId);

        Long applicationId = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation)
                VALUES (?, ?, ?, 'Original motivation')
                RETURNING id
                """, Long.class,
                roundId,
                clubId,
                studentId);

        Long questionId = jdbc.queryForObject("""
                INSERT INTO application_questions
                    (round_id, prompt, display_order)
                VALUES (?, 'Why join?', 1)
                RETURNING id
                """, Long.class, roundId);

        jdbc.update("""
                INSERT INTO application_answers
                    (application_id, question_id, round_id, answer_text)
                VALUES (?, ?, ?, 'Original answer')
                """,
                applicationId,
                questionId,
                roundId);

        jdbc.update("""
                INSERT INTO application_status_history
                    (application_id, from_status, to_status, actor_id)
                VALUES (?, NULL, 'SUBMITTED', ?)
                """, applicationId, studentId);

        var applicationBefore = jdbc.queryForMap(
                "SELECT * FROM applications WHERE id = ?",
                applicationId);

        var answersBefore = jdbc.queryForList("""
                SELECT * FROM application_answers
                WHERE application_id = ? ORDER BY id
                """, applicationId);

        var historyBefore = jdbc.queryForList("""
                SELECT * FROM application_status_history
                WHERE application_id = ? ORDER BY id
                """, applicationId);

        var principal = new ClubHubPrincipal(
                committeeId,
                "committee-" + suffix,
                "USER");

        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal,
                        null,
                        List.of()));

        var result = service.closeRound(clubId, roundId, 0L);

        assertNotNull(result.closedAt());
        assertEquals(1L, result.version().longValue());
        assertEquals("PUBLISHED", result.publicationStatus());

        assertEquals(
                applicationBefore,
                jdbc.queryForMap(
                        "SELECT * FROM applications WHERE id = ?",
                        applicationId));

        assertEquals(
                answersBefore,
                jdbc.queryForList("""
                        SELECT * FROM application_answers
                        WHERE application_id = ? ORDER BY id
                        """, applicationId));

        assertEquals(
                historyBefore,
                jdbc.queryForList("""
                        SELECT * FROM application_status_history
                        WHERE application_id = ? ORDER BY id
                        """, applicationId));

        OffsetDateTime storedClosedAt = jdbc.queryForObject("""
                SELECT closed_at
                FROM recruitment_rounds
                WHERE id = ?
                """, OffsetDateTime.class, roundId);

        assertNotNull(storedClosedAt);
        assertEquals(
                result.closedAt(),
                storedClosedAt.toInstant());
    }
}