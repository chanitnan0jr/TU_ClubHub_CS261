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
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests the real Spring Security filter chain AND the real question service.
 * Uses the existing disposable PostgreSQL test database, not H2.
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
class ApplicationQuestionSecurityIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void unauthenticatedGetReturns401() throws Exception {
        mvc.perform(get("/api/v1/rounds/1/questions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void postWithoutCsrfReturns403() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        mvc.perform(post(path(owner.roundId()))
                        .with(authentication(authFor(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validWriteBody()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    void ordinaryAuthenticatedUserCannotReadQuestions() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        Long ordinaryUserId = createUserWithActiveStudentProfile();
        mvc.perform(get(path(owner.roundId()))
                        .with(authentication(authFor(ordinaryUserId))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void committeeOfAnotherClubCannotReadQuestions() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        Fixture outsider = createEditableRoundWithCommittee();
        mvc.perform(get(path(owner.roundId()))
                        .with(authentication(authFor(outsider))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void committeeApplicantCannotReadOwnRoundsQuestions() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        jdbc.update("""
                INSERT INTO applications (round_id, club_id, applicant_id, motivation)
                VALUES (?, ?, ?, 'Submitted by committee user')
                """, owner.roundId(), owner.clubId(), owner.userId());
        mvc.perform(get(path(owner.roundId()))
                        .with(authentication(authFor(owner))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void activeCommitteeCanReadEmptyQuestionList() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        mvc.perform(get(path(owner.roundId()))
                        .with(authentication(authFor(owner))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void activeCommitteeCanCreateQuestionWithCsrf() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        mvc.perform(post(path(owner.roundId()))
                        .with(authentication(authFor(owner)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validWriteBody()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("/questions/")))
                .andExpect(jsonPath("$.questionText").value("Why join?"))
                .andExpect(jsonPath("$.isRequired").value(true))
                .andExpect(jsonPath("$.roundId").value(owner.roundId().toString()));
    }

    @Test
    void questionFromDifferentRoundCannotBeUpdated() throws Exception {
        Fixture owner = createEditableRoundWithCommittee();
        Fixture other = createEditableRoundWithCommittee();
        Long foreignQuestionId = jdbc.queryForObject("""
                INSERT INTO application_questions (round_id, prompt, is_required, display_order)
                VALUES (?, 'Foreign question', TRUE, 1)
                RETURNING id
                """, Long.class, other.roundId());
        mvc.perform(put(path(owner.roundId()) + "/" + foreignQuestionId)
                        .with(authentication(authFor(owner)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validWriteBody()))
                .andExpect(status().isNotFound());
    }

    private static String path(Long roundId) {
        return "/api/v1/rounds/" + roundId + "/questions";
    }

    private static String validWriteBody() {
        return "{\"questionText\":\"Why join?\",\"isRequired\":true}";
    }

    private UsernamePasswordAuthenticationToken authFor(Fixture fixture) {
        return authFor(fixture.userId());
    }

    private UsernamePasswordAuthenticationToken authFor(Long userId) {
        ClubHubPrincipal principal = new ClubHubPrincipal(userId, "test-" + userId, "USER");
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
    }

    private Long createUserWithActiveStudentProfile() {
        String suffix = UUID.randomUUID().toString();
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Question security test user')
                RETURNING id
                """, Long.class, "question-security-" + suffix);
        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, userId, "T-" + suffix.replace("-", "").substring(0, 16));
        return userId;
    }

    private Fixture createEditableRoundWithCommittee() {
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);
        String suffix = UUID.randomUUID().toString();
        Long userId = createUserWithActiveStudentProfile();

        Long categoryId = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, "question-category-" + suffix);
        Long clubId = jdbc.queryForObject("""
                INSERT INTO clubs (category_id, name, description, status, created_by)
                VALUES (?, ?, 'Question security test club', 'ACTIVE', ?) RETURNING id
                """, Long.class, categoryId, "question-club-" + suffix, userId);

        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?) RETURNING id
                """, Long.class, clubId, userId, now.minusDays(1));
        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?)
                """, membershipId, now.minusDays(1), now.plusDays(1), userId);

        Long roundId = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description,
                     opens_at, closes_at, confirmation_deadline,
                     publication_status, created_by)
                VALUES (?, 'Security test round', 2569, 1, 'Description',
                        ?, ?, ?, 'DRAFT', ?)
                RETURNING id
                """, Long.class, clubId, now.plusHours(1), now.plusHours(2),
                now.plusDays(1), userId);
        return new Fixture(userId, clubId, roundId);
    }

    private record Fixture(Long userId, Long clubId, Long roundId) {}
}
