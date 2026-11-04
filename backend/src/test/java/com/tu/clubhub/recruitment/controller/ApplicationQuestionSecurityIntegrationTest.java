package com.tu.clubhub.recruitment.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.annotation.Propagation;
import javax.sql.DataSource;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
@Transactional
class ApplicationQuestionSecurityIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;
    @Autowired private DataSource dataSource;

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

    @ParameterizedTest
    @ValueSource(strings = {"PUT", "DELETE"})
    void answeredQuestionHttpConflictPreservesAllData(String method) throws Exception {
        AnsweredFixture f = answeredFixture();
        // A published answered question must report the per-question reason, not hide it behind round state.
        jdbc.update("UPDATE recruitment_rounds SET publication_status='PUBLISHED', published_at=now() WHERE id=?", f.owner().roundId());
        var before = snapshot(f);
        var request = method.equals("PUT") ? put(path(f.owner().roundId()) + "/" + f.answered())
                : delete(path(f.owner().roundId()) + "/" + f.answered());
        mvc.perform(request.with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(validWriteBody()))
                .andExpect(status().isConflict())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.reason").value("QUESTION_HAS_ANSWERS"))
                .andExpect(jsonPath("$.detail").value("Question has answers"));
        assertEquals(before, snapshot(f));
    }

    @Test
    void unansweredQuestionsRemainEditableDeletableAndSortableInMixedDraft() throws Exception {
        AnsweredFixture f = answeredFixture();
        var answeredBefore = jdbc.queryForMap("SELECT * FROM application_questions WHERE id=?", f.answered());
        var answersBefore = jdbc.queryForList("SELECT * FROM application_answers WHERE application_id=?", f.application());
        mvc.perform(put(path(f.owner().roundId()) + "/" + f.first()).with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(validWriteBody()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(Long.toString(f.first())));
        assertEquals("Why join?", jdbc.queryForObject("SELECT prompt FROM application_questions WHERE id=?", String.class, f.first()));
        mvc.perform(put(path(f.owner().roundId()) + "/order").with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"questionIds\":[\"" + f.last() + "\",\"" + f.answered() + "\",\"" + f.first() + "\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(Long.toString(f.last())))
                .andExpect(jsonPath("$.items[1].displayOrder").value(2));
        mvc.perform(delete(path(f.owner().roundId()) + "/" + f.last()).with(authentication(authFor(f.owner()))).with(csrf()))
                .andExpect(status().isNoContent());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM application_questions WHERE id=?", Integer.class, f.last()));
        assertEquals(List.of(2, 3), jdbc.queryForList("SELECT display_order FROM application_questions WHERE round_id=? ORDER BY display_order", Integer.class, f.owner().roundId()));
        // Gaps are legal. Reordering remaining unanswered rows must still work after a deletion.
        mvc.perform(put(path(f.owner().roundId()) + "/order").with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"questionIds\":[\"" + f.first() + "\",\"" + f.answered() + "\"]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].displayOrder").value(1));
        assertEquals(answeredBefore, jdbc.queryForMap("SELECT * FROM application_questions WHERE id=?", f.answered()));
        assertEquals(answersBefore, jdbc.queryForList("SELECT * FROM application_answers WHERE application_id=?", f.application()));
    }

    @Test
    void movingAnAnsweredPositionIsRejectedAtomically() throws Exception {
        AnsweredFixture f = answeredFixture();
        var before = snapshot(f);
        mvc.perform(put(path(f.owner().roundId()) + "/order").with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"questionIds\":[\"" + f.first() + "\",\"" + f.last() + "\",\"" + f.answered() + "\"]}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.reason").value("QUESTION_HAS_ANSWERS"));
        assertEquals(before, snapshot(f));
    }

    @Test
    void wholeRoundReplacementCannotBypassAnsweredQuestionProtection() throws Exception {
        AnsweredFixture f = answeredFixture();
        var before = snapshot(f);
        var now = clock.instant().atOffset(ZoneOffset.UTC);
        String body = """
                {"title":"Replacement","academicYear":2569,"semester":1,"description":"Replacement",
                 "opensAt":"%s","closesAt":"%s","confirmationDeadline":"%s","version":0,"questions":[]}
                """.formatted(now.plusHours(1), now.plusHours(2), now.plusDays(1));
        mvc.perform(put("/api/v1/clubs/" + f.owner().clubId() + "/rounds/" + f.owner().roundId())
                        .with(authentication(authFor(f.owner()))).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.reason").value("QUESTION_HAS_ANSWERS"));
        assertEquals(before, snapshot(f));
    }

    @Test
    void unansweredQuestionInPublishedRoundStillCannotBeEdited() throws Exception {
        AnsweredFixture f = answeredFixture();
        jdbc.update("UPDATE recruitment_rounds SET publication_status='PUBLISHED', published_at=now() WHERE id=?", f.owner().roundId());
        var before = snapshot(f);
        mvc.perform(put(path(f.owner().roundId()) + "/" + f.first()).with(authentication(authFor(f.owner()))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(validWriteBody()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.reason").value("ROUND_NOT_EDITABLE"));
        assertEquals(before, snapshot(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUT", "DELETE"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void answerCommittedWhileQuestionWriteWaitsIsRecheckedAfterParentLock(String method) throws Exception {
        // No outer test transaction: every fixture is committed before the HTTP worker starts.
        AnsweredFixture f = answeredFixture();
        jdbc.update("DELETE FROM application_answers WHERE application_id=?", f.application());
        var questionsBefore = jdbc.queryForList("SELECT * FROM application_questions WHERE round_id=? ORDER BY id", f.owner().roundId());
        var workers = Executors.newSingleThreadExecutor();
        try (var holder = dataSource.getConnection()) {
            holder.setAutoCommit(false);
            try {
                int holderPid;
                try (var st = holder.createStatement(); var rs = st.executeQuery("SELECT pg_backend_pid()")) {
                    rs.next(); holderPid = rs.getInt(1);
                }
                // Same parent SHARE and child SHARE protocol as ApplicationRepository submission.
                for (String sql : List.of("SELECT id FROM recruitment_rounds WHERE id=? FOR SHARE",
                        "SELECT id FROM application_questions WHERE round_id=? ORDER BY id FOR SHARE")) {
                    try (var st = holder.prepareStatement(sql)) { st.setLong(1, f.owner().roundId()); st.executeQuery().close(); }
                }
                var began = new CountDownLatch(1);
                var request = workers.submit(() -> {
                    began.countDown();
                    var builder = method.equals("PUT") ? put(path(f.owner().roundId()) + "/" + f.answered())
                            : delete(path(f.owner().roundId()) + "/" + f.answered());
                    return mvc.perform(builder.with(authentication(authFor(f.owner()))).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON).content(validWriteBody())).andReturn();
                });
                assertTrue(began.await(5, TimeUnit.SECONDS));
                long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
                boolean blocked = false;
                while (System.nanoTime() < until) {
                    blocked = Boolean.TRUE.equals(jdbc.queryForObject(
                            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid)))", Boolean.class, holderPid));
                    if (blocked) break;
                    Thread.yield();
                }
                assertTrue(blocked, "PostgreSQL must observe the HTTP transaction waiting on the answer-writer lock");
                assertFalse(request.isDone());
                try (var st = holder.prepareStatement("INSERT INTO application_answers(application_id,round_id,question_id,answer_text) VALUES (?,?,?,'Committed while editor waits')")) {
                    st.setLong(1, f.application()); st.setLong(2, f.owner().roundId()); st.setLong(3, f.answered()); st.executeUpdate();
                }
                holder.commit();
                var response = request.get(10, TimeUnit.SECONDS).getResponse();
                assertEquals(409, response.getStatus());
                assertTrue(response.getContentAsString().contains("\"reason\":\"QUESTION_HAS_ANSWERS\""));
                assertEquals(questionsBefore, jdbc.queryForList("SELECT * FROM application_questions WHERE round_id=? ORDER BY id", f.owner().roundId()));
                assertEquals("Committed while editor waits", jdbc.queryForObject("SELECT answer_text FROM application_answers WHERE application_id=?", String.class, f.application()));
                assertEquals(0L, jdbc.queryForObject("SELECT version FROM recruitment_rounds WHERE id=?", Long.class, f.owner().roundId()));
            } finally {
                holder.rollback();
                workers.shutdownNow();
                assertTrue(workers.awaitTermination(10, TimeUnit.SECONDS));
            }
        } finally {
            workers.shutdownNow();
            cleanupCommittedFixture(f);
        }
    }

    private void cleanupCommittedFixture(AnsweredFixture f) {
        long applicant = jdbc.queryForObject("SELECT applicant_id FROM applications WHERE id=?", Long.class, f.application());
        long category = jdbc.queryForObject("SELECT category_id FROM clubs WHERE id=?", Long.class, f.owner().clubId());
        jdbc.update("DELETE FROM application_status_history WHERE application_id=?", f.application());
        jdbc.update("DELETE FROM application_answers WHERE application_id=?", f.application());
        jdbc.update("DELETE FROM applications WHERE id=?", f.application());
        jdbc.update("DELETE FROM application_questions WHERE round_id=?", f.owner().roundId());
        jdbc.update("DELETE FROM recruitment_rounds WHERE id=?", f.owner().roundId());
        jdbc.update("DELETE FROM club_committee_assignments WHERE membership_id IN (SELECT id FROM club_memberships WHERE club_id=?)", f.owner().clubId());
        jdbc.update("DELETE FROM club_memberships WHERE club_id=?", f.owner().clubId());
        jdbc.update("DELETE FROM clubs WHERE id=?", f.owner().clubId());
        jdbc.update("DELETE FROM club_categories WHERE id=?", category);
        jdbc.update("DELETE FROM student_profiles WHERE user_id IN (?,?)", applicant, f.owner().userId());
        jdbc.update("DELETE FROM users WHERE id IN (?,?)", applicant, f.owner().userId());
    }

    private AnsweredFixture answeredFixture() {
        Fixture owner = createEditableRoundWithCommittee();
        long first = insertQuestion(owner.roundId(), "Unanswered first", 1);
        long answered = insertQuestion(owner.roundId(), "Answered original", 2);
        long last = insertQuestion(owner.roundId(), "Unanswered last", 3);
        long applicant = createUserWithActiveStudentProfile();
        long application = jdbc.queryForObject("INSERT INTO applications(round_id,club_id,applicant_id,motivation) VALUES (?,?,?,'Fictional') RETURNING id", Long.class, owner.roundId(), owner.clubId(), applicant);
        jdbc.update("INSERT INTO application_answers(application_id,round_id,question_id,answer_text) VALUES (?,?,?,'Preserve this answer')", application, owner.roundId(), answered);
        jdbc.update("INSERT INTO application_status_history(application_id,from_status,to_status,actor_id) VALUES (?,NULL,'SUBMITTED',?)", application, applicant);
        return new AnsweredFixture(owner, answered, first, last, application);
    }

    private long insertQuestion(long round, String prompt, int order) {
        return jdbc.queryForObject("INSERT INTO application_questions(round_id,prompt,is_required,display_order) VALUES (?,?,false,?) RETURNING id", Long.class, round, prompt, order);
    }

    private Object snapshot(AnsweredFixture f) {
        return List.of(jdbc.queryForMap("SELECT * FROM recruitment_rounds WHERE id=?", f.owner().roundId()),
                jdbc.queryForList("SELECT * FROM application_questions WHERE round_id=? ORDER BY id", f.owner().roundId()),
                jdbc.queryForMap("SELECT * FROM applications WHERE id=?", f.application()),
                jdbc.queryForList("SELECT * FROM application_answers WHERE application_id=? ORDER BY id", f.application()),
                jdbc.queryForList("SELECT * FROM application_status_history WHERE application_id=? ORDER BY id", f.application()));
    }

    private record AnsweredFixture(Fixture owner, long answered, long first, long last, long application) {}

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
