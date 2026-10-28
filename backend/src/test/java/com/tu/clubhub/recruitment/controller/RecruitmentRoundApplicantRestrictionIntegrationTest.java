package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Permission matrix section 4, rule 2: a committee member with an application
 * in a round, in any status, cannot manage that round. Runs the real filter
 * chain and service against the disposable PostgreSQL test database.
 */
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
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecruitmentRoundApplicantRestrictionIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void applicantCommitteeCannotReplaceRound() throws Exception {
        Fixture f = createClubWithCommittee();
        Long roundId = createDraftRound(f);
        apply(f, roundId, "SUBMITTED");

        mvc.perform(put(roundPath(f, roundId))
                        .with(authentication(authFor(f.userId())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replaceBody(f.now(), 0L)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        Map<String, Object> round = roundRow(roundId);
        assertEquals("Original title", round.get("title"));
        assertEquals(0L, round.get("version"));
        assertEquals(1L, jdbc.queryForObject("""
                SELECT COUNT(*) FROM application_questions WHERE round_id = ?
                """, Long.class, roundId));
    }

    @Test
    void applicantCommitteeCannotPublishRound() throws Exception {
        Fixture f = createClubWithCommittee();
        Long roundId = createDraftRound(f);
        apply(f, roundId, "SUBMITTED");

        mvc.perform(patch(roundPath(f, roundId))
                        .with(authentication(authFor(f.userId())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"action\":\"PUBLISH\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        Map<String, Object> round = roundRow(roundId);
        assertEquals("DRAFT", round.get("publication_status"));
        assertEquals(0L, round.get("version"));
    }

    @Test
    void withdrawnApplicationStillBlocksClosingRound() throws Exception {
        Fixture f = createClubWithCommittee();
        Long roundId = createOpenPublishedRound(f);
        apply(f, roundId, "WITHDRAWN");

        mvc.perform(patch(roundPath(f, roundId))
                        .with(authentication(authFor(f.userId())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"action\":\"CLOSE\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        Map<String, Object> round = roundRow(roundId);
        assertNull(round.get("closed_at"));
        assertEquals(0L, round.get("version"));
    }

    @Test
    void committeeMemberWithoutApplicationCanStillPublish() throws Exception {
        Fixture f = createClubWithCommittee();
        Long roundId = createDraftRound(f);
        apply(f, roundId, "SUBMITTED");
        Long colleagueId = addCommitteeMember(f);

        mvc.perform(patch(roundPath(f, roundId))
                        .with(authentication(authFor(colleagueId)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"action\":\"PUBLISH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationStatus").value("PUBLISHED"));

        assertEquals("PUBLISHED", roundRow(roundId).get("publication_status"));
    }

    private static String roundPath(Fixture f, Long roundId) {
        return "/api/v1/clubs/" + f.clubId() + "/rounds/" + roundId;
    }

    private static String replaceBody(OffsetDateTime now, long version) {
        return """
                {"title":"Replaced title","academicYear":2569,"semester":1,
                 "description":"Replaced","opensAt":"%s","closesAt":"%s",
                 "confirmationDeadline":"%s","questions":[],"version":%d}
                """.formatted(now.plusHours(1), now.plusHours(3), now.plusDays(1), version);
    }

    private UsernamePasswordAuthenticationToken authFor(Long userId) {
        ClubHubPrincipal principal = new ClubHubPrincipal(userId, "test-" + userId, "USER");
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
    }

    private Map<String, Object> roundRow(Long roundId) {
        return jdbc.queryForMap("""
                SELECT title, publication_status, closed_at, version
                FROM recruitment_rounds WHERE id = ?
                """, roundId);
    }

    private void apply(Fixture f, Long roundId, String status) {
        jdbc.update("""
                INSERT INTO applications (round_id, club_id, applicant_id, motivation, status)
                VALUES (?, ?, ?, 'Submitted by committee user', ?)
                """, roundId, f.clubId(), f.userId(), status);
    }

    private Long createUserWithActiveStudentProfile() {
        String suffix = UUID.randomUUID().toString();
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Round applicant test user')
                RETURNING id
                """, Long.class, "round-applicant-" + suffix);
        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, userId, "R-" + suffix.replace("-", "").substring(0, 16));
        return userId;
    }

    private Fixture createClubWithCommittee() {
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);
        String suffix = UUID.randomUUID().toString();
        Long userId = createUserWithActiveStudentProfile();

        Long categoryId = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, "round-category-" + suffix);
        Long clubId = jdbc.queryForObject("""
                INSERT INTO clubs (category_id, name, description, status, created_by)
                VALUES (?, ?, 'Round applicant test club', 'ACTIVE', ?) RETURNING id
                """, Long.class, categoryId, "round-club-" + suffix, userId);

        Fixture fixture = new Fixture(userId, clubId, now);
        assignCommittee(fixture, userId);
        return fixture;
    }

    private Long addCommitteeMember(Fixture f) {
        Long userId = createUserWithActiveStudentProfile();
        assignCommittee(f, userId);
        return userId;
    }

    private void assignCommittee(Fixture f, Long userId) {
        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?) RETURNING id
                """, Long.class, f.clubId(), userId, f.now().minusDays(1));
        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?)
                """, membershipId, f.now().minusDays(1), f.now().plusDays(1), userId);
    }

    private Long createDraftRound(Fixture f) {
        Long roundId = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description,
                     opens_at, closes_at, confirmation_deadline,
                     publication_status, created_by)
                VALUES (?, 'Original title', 2569, 1, 'Description',
                        ?, ?, ?, 'DRAFT', ?)
                RETURNING id
                """, Long.class, f.clubId(), f.now().plusHours(1), f.now().plusHours(2),
                f.now().plusDays(1), f.userId());
        jdbc.update("""
                INSERT INTO application_questions (round_id, prompt, is_required, display_order)
                VALUES (?, 'Original question', TRUE, 1)
                """, roundId);
        return roundId;
    }

    private Long createOpenPublishedRound(Fixture f) {
        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description,
                     opens_at, closes_at, confirmation_deadline,
                     publication_status, published_at, created_by)
                VALUES (?, 'Original title', 2569, 1, 'Description',
                        ?, ?, ?, 'PUBLISHED', ?, ?)
                RETURNING id
                """, Long.class, f.clubId(), f.now().minusHours(1), f.now().plusHours(1),
                f.now().plusDays(1), f.now().minusHours(2), f.userId());
    }

    private record Fixture(Long userId, Long clubId, OffsetDateTime now) {}
}
