package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.recruitment.dto.QuestionInput;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
        TestClub fixture = createClubWithCommittee();
        OffsetDateTime now = fixture.now();

        Long studentId = createUser("student");

        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code)
                VALUES (?, ?)
                """, studentId, studentCode());

        Long roundId = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status,
                     published_at, created_by)
                VALUES (?, 'Test round', 2569, 1,
                        'Description', ?, ?, ?, 'PUBLISHED', ?, ?)
                RETURNING id
                """,
                Long.class,
                fixture.clubId(),
                now.minusHours(1),
                now.plusHours(1),
                now.plusDays(1),
                now.minusHours(2),
                fixture.userId());

        Long applicationId = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation)
                VALUES (?, ?, ?, 'Original motivation')
                RETURNING id
                """,
                Long.class,
                roundId,
                fixture.clubId(),
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

        var result = service.closeRound(
                fixture.clubId(), roundId, 0L);

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

    @Test
    void createUpdateAndPublishRoundWithQuestions() {
        TestClub fixture = createClubWithCommittee();
        OffsetDateTime now = fixture.now();
        Long clubId = fixture.clubId();

        var createRequest = new RoundWriteRequest(
                "Original title",
                2569,
                1,
                "Original description",
                null,
                now.plusHours(1),
                now.plusHours(2),
                now.plusDays(1),
                null,
                List.of(new QuestionInput(
                        "Original question", true, 1, 500)),
                null);

        var created = service.createRound(clubId, createRequest);

        assertNotNull(created.id());
        assertEquals("DRAFT", created.publicationStatus());
        assertEquals(0L, created.version().longValue());
        assertEquals(fixture.userId(), created.createdBy());

        assertEquals(
                "Original question",
                jdbc.queryForObject("""
                        SELECT prompt FROM application_questions
                        WHERE round_id = ?
                        """, String.class, created.id()));

        var updateRequest = new RoundWriteRequest(
                "Updated title",
                2569,
                1,
                "Updated description",
                null,
                now.plusHours(1),
                now.plusHours(3),
                now.plusDays(1),
                null,
                List.of(new QuestionInput(
                        "Updated question", false, 1, 1000)),
                created.version());

        var updated = service.updateRound(
                clubId, created.id(), updateRequest);

        assertEquals("Updated title", updated.title());
        assertEquals(1L, updated.version().longValue());

        Long questionCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM application_questions
                WHERE round_id = ?
                """, Long.class, created.id());

        assertNotNull(questionCount);
        assertEquals(1L, questionCount.longValue());

        assertEquals(
                "Updated question",
                jdbc.queryForObject("""
                        SELECT prompt FROM application_questions
                        WHERE round_id = ?
                        """, String.class, created.id()));

        var published = service.publishRound(
                clubId, created.id(), updated.version());

        assertEquals("PUBLISHED", published.publicationStatus());
        assertNotNull(published.publishedAt());
        assertEquals(2L, published.version().longValue());

        assertEquals(
                "PUBLISHED",
                jdbc.queryForObject("""
                        SELECT publication_status
                        FROM recruitment_rounds
                        WHERE id = ?
                        """, String.class, created.id()));

        var forbiddenUpdate = new RoundWriteRequest(
                "Forbidden edit",
                2569,
                1,
                "Description",
                null,
                now.plusHours(1),
                now.plusHours(3),
                now.plusDays(1),
                null,
                List.of(),
                published.version());

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.updateRound(
                        clubId, created.id(), forbiddenUpdate));

        assertEquals(409, error.getStatusCode().value());

        assertEquals(
                "Updated title",
                jdbc.queryForObject("""
                        SELECT title FROM recruitment_rounds
                        WHERE id = ?
                        """, String.class, created.id()));
    }

    private TestClub createClubWithCommittee() {
        String suffix = UUID.randomUUID().toString();
        OffsetDateTime now =
                clock.instant().atOffset(ZoneOffset.UTC);

        String username = "committee-" + suffix;

        Long userId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test committee')
                RETURNING id
                """, Long.class, username);

        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code)
                VALUES (?, ?)
                """, userId, studentCode());

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
                """,
                Long.class,
                categoryId,
                "club-" + suffix,
                userId);

        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships
                    (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?)
                RETURNING id
                """,
                Long.class,
                clubId,
                userId,
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
                userId);

        var principal = new ClubHubPrincipal(
                userId, username, "USER");

        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, List.of()));

        return new TestClub(clubId, userId, now);
    }

    private Long createUser(String prefix) {
        return jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test user')
                RETURNING id
                """,
                Long.class,
                prefix + "-" + UUID.randomUUID());
    }

    private String studentCode() {
        return "T-" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 16);
    }

    private record TestClub(
            Long clubId,
            Long userId,
            OffsetDateTime now) {
    }
}