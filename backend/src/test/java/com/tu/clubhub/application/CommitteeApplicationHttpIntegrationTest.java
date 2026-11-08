package com.tu.clubhub.application;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.HashSet;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.*;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/** Real filters, ClubSecurity/assignment SQL, service and PostgreSQL projections; no repository mocks. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
@Import(CommitteeApplicationHttpIntegrationTest.Configuration.class)
@Transactional
class CommitteeApplicationHttpIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired SessionRepository<?> sessions;
    @Autowired PlatformTransactionManager transactions;
    private final List<Long> fixtureUsers = new ArrayList<>(), fixtureClubs = new ArrayList<>();
    private final Set<String> fixtureSessions = new HashSet<>();
    private boolean committedFixtures;
    long reviewer, otherReviewer, applicant, category, club, otherClub, round, otherRound, otherClubRound, assignment, membership, application;

    @BeforeEach void fixtures() {
        assertEquals("PostgreSQL", jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)
                connection -> connection.getMetaData().getDatabaseProductName()));
        reviewer = student("Reviewer"); otherReviewer = student("Other Reviewer"); applicant = student("ผู้สมัคร 😀\nบรรทัดใหม่");
        category = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id", Long.class, "Task65 " + UUID.randomUUID());
        club = club(); otherClub = club();
        assignment = assign(reviewer, club);
        membership = jdbc.queryForObject("SELECT membership_id FROM club_committee_assignments WHERE id = ?", Long.class, assignment);
        assign(otherReviewer, otherClub);
        round = round(club, "PUBLISHED"); otherRound = round(club, "PUBLISHED"); otherClubRound = round(otherClub, "PUBLISHED");
        application = application(round, club, applicant);
    }
    @AfterEach void cleanup() {
        SecurityContextHolder.clearContext();
        if (!committedFixtures) return; // Ordinary read tests still use their original automatic fixture rollback.
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        for (String session : fixtureSessions) sessions.deleteById(session);
        for (long targetClub : fixtureClubs) {
            jdbc.update("DELETE FROM club_committee_assignments WHERE membership_id IN (SELECT id FROM club_memberships WHERE club_id=?)", targetClub);
            jdbc.update("DELETE FROM membership_history WHERE membership_id IN (SELECT id FROM club_memberships WHERE club_id=?)", targetClub);
            jdbc.update("DELETE FROM club_memberships WHERE club_id=?", targetClub);
            for (String table : List.of("application_reviews", "application_status_history", "application_answers", "application_links"))
                jdbc.update("DELETE FROM " + table + " WHERE application_id IN (SELECT id FROM applications WHERE club_id=?)", targetClub);
            jdbc.update("DELETE FROM applications WHERE club_id=?", targetClub);
            jdbc.update("DELETE FROM application_questions WHERE round_id IN (SELECT id FROM recruitment_rounds WHERE club_id=?)", targetClub);
            jdbc.update("DELETE FROM recruitment_rounds WHERE club_id=?", targetClub);
            jdbc.update("DELETE FROM clubs WHERE id=?", targetClub);
        }
        jdbc.update("DELETE FROM club_categories WHERE id=?", category);
        for (long user : fixtureUsers) {
            jdbc.update("DELETE FROM student_profiles WHERE user_id=?", user);
            jdbc.update("DELETE FROM users WHERE id=?", user);
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id=?", Long.class, user));
        }
    }

    @Test void committeeAndPresidentReadOnlyTheirClubWithNecessaryApplicantFields() throws Exception {
        application(otherClubRound, otherClub, student("Other club applicant"));
        var before = rows();
        var result = as(reviewer, get(path()));
        ok(result);
        var body = json(result);
        assertEquals(Set.of("items", "page"), body.propertyNames());
        assertEquals(1, body.path("items").size());
        var item = body.path("items").get(0);
        assertEquals(Set.of("id", "roundId", "applicant", "submittedAt", "status"), item.propertyNames());
        assertEquals(Long.toString(application), item.path("id").asText());
        assertEquals(Long.toString(round), item.path("roundId").asText());
        assertTrue(item.path("id").isString()); assertTrue(item.path("roundId").isString());
        assertEquals("SUBMITTED", item.path("status").asText());
        assertEquals(NOW, Instant.parse(item.path("submittedAt").asText()));
        assertEquals("ผู้สมัคร 😀\nบรรทัดใหม่", item.path("applicant").path("displayName").asText());
        assertEquals(Set.of("userId", "studentCode", "displayName", "email", "facultyName", "departmentName", "programName", "studyYear"),
                item.path("applicant").propertyNames());
        assertTrue(item.path("applicant").path("email").isNull());
        assertTrue(item.path("applicant").path("studyYear").isNull());
        assertEquals(1, body.path("page").path("totalElements").asInt());
        jdbc.update("UPDATE club_committee_assignments SET permission_role = 'PRESIDENT' WHERE id = ?", assignment);
        ok(as(reviewer, get(path() + "/" + application)));
        assertEquals(before, rows(), "Reads must not change application state, answers, reviews, history or round publication");
    }

    @Test void detailPairsQuestionsByIdPreservesOptionalGapsAndExcludesInternalData() throws Exception {
        long second = question(round, "Optional in the middle", false, 2);
        long third = question(round, "Third question", true, 3);
        long first = question(round, "First question", true, 1);
        answer(application, round, first, "คำตอบหนึ่ง 😀"); answer(application, round, third, "คำตอบสาม\nหลายบรรทัด");
        jdbc.update("INSERT INTO application_links(application_id,label,url,display_order) VALUES (?, 'Portfolio', 'https://example.org/task65.pdf', 1)", application);
        jdbc.update("INSERT INTO application_reviews(application_id,reviewer_id,recommendation,internal_comment) VALUES (?, ?, 'DISCUSS', 'SECRET-INTERNAL-NOTE')", application, reviewer);
        jdbc.update("UPDATE student_profiles SET study_year = 12 WHERE user_id = ?", applicant);
        var before = rows();
        var result = as(reviewer, get(path() + "/" + application)); ok(result);
        var body = json(result);
        assertEquals(Set.of("id", "clubId", "roundId", "applicant", "motivation", "questionsWithAnswers", "links", "status", "submittedAt"), body.propertyNames());
        assertEquals("12", body.path("applicant").path("studyYear").asText());
        assertEquals("Fictional motivation", body.path("motivation").asText());
        var questions = body.path("questionsWithAnswers"); assertEquals(3, questions.size());
        assertEquals(List.of(Long.toString(first), Long.toString(second), Long.toString(third)),
                List.of(questions.get(0).path("questionId").asText(), questions.get(1).path("questionId").asText(), questions.get(2).path("questionId").asText()));
        assertEquals("คำตอบหนึ่ง 😀", questions.get(0).path("answerText").asText());
        assertTrue(questions.get(1).path("answerText").isNull());
        assertEquals("คำตอบสาม\nหลายบรรทัด", questions.get(2).path("answerText").asText());
        for (var item : questions) assertEquals(Set.of("questionId", "questionText", "isRequired", "displayOrder", "answerText"), item.propertyNames());
        assertEquals(1, body.path("links").size());
        assertEquals(Set.of("id", "label", "url", "displayOrder"), body.path("links").get(0).propertyNames());
        assertEquals("https://example.org/task65.pdf", body.path("links").get(0).path("url").asText());
        for (String forbidden : List.of("SECRET-INTERNAL-NOTE", "reviews", "reviewerId", "internalComment", "tuUsername", "systemRole", "decidedBy", "statusHistory"))
            assertFalse(result.getResponse().getContentAsString().contains(forbidden), forbidden);
        assertEquals(before, rows());
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void otherCommitteeOrdinaryUserAndGlobalAdminCannotReadOrProbeChildren(boolean detail) throws Exception {
        String target = path() + (detail ? "/" + application : "");
        problem(as(otherReviewer, get(target)), 403, "ACCESS_DENIED", null);
        problem(as(applicant, get(target)), 403, "ACCESS_DENIED", null);
        jdbc.update("UPDATE users SET system_role = 'ADMIN' WHERE id = ?", applicant);
        problem(as(applicant, get(target)), 403, "ACCESS_DENIED", null);
        problem(as(otherReviewer, get(path() + "/9223372036854775807")), 403, "ACCESS_DENIED", null);
        problem(mvc.perform(get(target)).andReturn(), 401, "AUTHENTICATION_REQUIRED", null);
    }

    @ParameterizedTest @ValueSource(strings = {"revoked", "expired", "future", "inactive-membership", "future-membership", "ended-membership", "inactive-student", "inactive-club", "suspended"})
    void ineffectiveAssignmentsCannotReadEitherEndpoint(String scenario) throws Exception {
        switch (scenario) {
            case "revoked" -> jdbc.update("UPDATE club_committee_assignments SET status='REVOKED', revoked_at=created_at, revoked_by=? WHERE id=?", reviewer, assignment);
            case "expired" -> jdbc.update("UPDATE club_committee_assignments SET ends_at=? WHERE id=?", at(NOW), assignment);
            case "future" -> jdbc.update("UPDATE club_committee_assignments SET starts_at=? WHERE id=?", at(NOW.plusSeconds(1)), assignment);
            case "inactive-membership" -> jdbc.update("UPDATE club_memberships SET status='INACTIVE' WHERE id=?", membership);
            case "future-membership" -> jdbc.update("UPDATE club_memberships SET joined_at=? WHERE id=?", at(NOW.plusSeconds(1)), membership);
            case "ended-membership" -> jdbc.update("UPDATE club_memberships SET status='LEFT', ended_at=? WHERE id=?", at(NOW), membership);
            case "inactive-student" -> jdbc.update("UPDATE student_profiles SET student_status='INACTIVE' WHERE user_id=?", reviewer);
            case "inactive-club" -> jdbc.update("UPDATE clubs SET status='INACTIVE' WHERE id=?", club);
            case "suspended" -> jdbc.update("UPDATE users SET account_status='SUSPENDED' WHERE id=?", reviewer);
        }
        for (String target : List.of(path(), path() + "/" + application))
            problem(as(reviewer, get(target)), 403, scenario.equals("suspended") ? "ACCOUNT_NOT_ALLOWED" : "ACCESS_DENIED", null);
    }

    @Test void permissionIsRecheckedOnTheNextRequestAfterRevocation() throws Exception {
        ok(as(reviewer, get(path())));
        jdbc.update("UPDATE club_committee_assignments SET status='REVOKED', revoked_at=created_at, revoked_by=? WHERE id=?", reviewer, assignment);
        problem(as(reviewer, get(path())), 403, "ACCESS_DENIED", null);
        problem(as(reviewer, get(path() + "/" + application)), 403, "ACCESS_DENIED", null);
    }

    @Test void assignmentStartsInclusivelyAtTheCurrentServerInstant() throws Exception {
        jdbc.update("UPDATE club_committee_assignments SET starts_at=? WHERE id=?", at(NOW), assignment);
        ok(as(reviewer, get(path()))); ok(as(reviewer, get(path() + "/" + application)));
    }

    @Test void filtersBeforePagingCountsNoForeignOrSelfReviewRoundsAndUsesStableTieBreaker() throws Exception {
        long next = application(round, club, student("Second"));
        long hidden = application(otherRound, club, student("Hidden behind self-review"));
        long own = application(otherRound, club, reviewer);
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?", own);
        application(otherClubRound, otherClub, student("Foreign club"));
        long draft = round(club, "DRAFT"); application(draft, club, student("Draft"));
        long cancelled = round(club, "CANCELLED"); application(cancelled, club, student("Cancelled"));
        List<String> ids = new ArrayList<>();
        for (int page = 0; page < 2; page++) {
            var result = as(reviewer, get(path()).param("size", "1").param("page", Integer.toString(page)));
            ok(result); var body = json(result);
            assertEquals(2, body.path("page").path("totalElements").asInt());
            assertEquals(2, body.path("page").path("totalPages").asInt());
            ids.add(body.path("items").get(0).path("id").asText());
        }
        assertEquals(List.of(Long.toString(application), Long.toString(next)), ids);
        var empty = as(reviewer, get(path()).param("page", "2147483647").param("size", "100")); ok(empty);
        assertEquals(0, json(empty).path("items").size()); assertEquals(2, json(empty).path("page").path("totalElements").asInt());
        problem(as(reviewer, get(path()).param("roundId", Long.toString(otherRound))), 403, "ACCESS_DENIED", null);
        problem(as(reviewer, get(path() + "/" + hidden)), 403, "ACCESS_DENIED", null);
    }

    @Test void statusRoundAndLiteralCaseInsensitiveSearchFiltersAreCombined() throws Exception {
        long second = application(otherRound, club, student("SearchTarget"));
        jdbc.update("UPDATE applications SET status='UNDER_REVIEW' WHERE id=?", second);
        var filtered = as(reviewer, get(path()).param("roundId", Long.toString(otherRound)).param("status", "UNDER_REVIEW").param("q", "searchtarget"));
        ok(filtered); assertEquals(Long.toString(second), json(filtered).path("items").get(0).path("id").asText());
        assertEquals(1, json(filtered).path("page").path("totalElements").asInt());
        for (String search : List.of("no-match", "' OR 1=1 --", "%", "_")) {
            var empty = as(reviewer, get(path()).param("q", search)); ok(empty);
            assertEquals(0, json(empty).path("items").size()); assertEquals(0, json(empty).path("page").path("totalElements").asInt());
        }
        String code = jdbc.queryForObject("SELECT student_code FROM student_profiles WHERE user_id=?", String.class, applicant);
        var byCode = as(reviewer, get(path()).param("q", code.toUpperCase())); ok(byCode);
        assertEquals(Long.toString(application), json(byCode).path("items").get(0).path("id").asText());
    }

    @Test void validatesChildScopeWithoutDisclosingOtherApplicants() throws Exception {
        long foreign = application(otherClubRound, otherClub, student("Private foreign name"));
        problem(as(reviewer, get(path() + "/" + foreign)), 403, "ACCESS_DENIED", null);
        problem(as(reviewer, get(path()).param("roundId", Long.toString(otherClubRound))), 403, "ACCESS_DENIED", null);
        problem(as(reviewer, get(path() + "/9223372036854775807")), 404, "RESOURCE_NOT_FOUND", null);
        problem(as(reviewer, get(path()).param("roundId", "9223372036854775807")), 404, "RESOURCE_NOT_FOUND", null);
    }

    @ParameterizedTest @ValueSource(strings = {"DRAFT", "CANCELLED"})
    void explicitUnavailableRoundReturnsConflictForListAndDetail(String state) throws Exception {
        jdbc.update("UPDATE recruitment_rounds SET publication_status=? WHERE id=?", state, round);
        String reason = state.equals("DRAFT") ? "ROUND_NOT_PUBLISHED" : "ROUND_CANCELLED";
        problem(as(reviewer, get(path()).param("roundId", Long.toString(round))), 409, "RESOURCE_CONFLICT", reason);
        problem(as(reviewer, get(path() + "/" + application)), 409, "RESOURCE_CONFLICT", reason);
    }

    @ParameterizedTest @CsvSource({"page,-1", "page,abc", "size,0", "size,101", "status,PENDING", "roundId,0", "roundId,1.5", "roundId,9223372036854775808"})
    void invalidQueriesAreSafe400Problems(String parameter, String value) throws Exception {
        problem(as(reviewer, get(path()).param(parameter, value)), 400,
                parameter.equals("roundId") ? "INVALID_RESOURCE_ID" : "VALIDATION_FAILED", null);
    }

    @ParameterizedTest @ValueSource(strings = {"abc", "0", "-1", "01", "1.5", "9223372036854775808"})
    void invalidClubAndApplicationIdsNeverBecome500(String id) throws Exception {
        problem(as(reviewer, get("/api/v1/clubs/" + id + "/applications")), 400, "INVALID_RESOURCE_ID", null);
        problem(as(reviewer, get(path() + "/" + id)), 400, "INVALID_RESOURCE_ID", null);
    }

    @Test void realJdbcSessionCookieAuthorizesTheStoredIdentityAndExpirationRejectsIt() throws Exception {
        var session = storedSession(sessions, reviewer);
        Cookie cookie = new Cookie("SESSION", Base64.getEncoder().encodeToString(session.getId().getBytes(StandardCharsets.UTF_8)));
        for (String target : List.of(path(), path() + "/" + application)) ok(mvc.perform(get(target).cookie(cookie)).andReturn());
        expireSession(sessions, session.getId());
        for (String target : List.of(path(), path() + "/" + application))
            problem(mvc.perform(get(target).cookie(cookie)).andReturn(), 401, "AUTHENTICATION_REQUIRED", null);
    }

    @Test void emptyPublishedClosedRoundIsReadableAndSearchLengthCountsUnicode() throws Exception {
        jdbc.update("UPDATE recruitment_rounds SET closes_at=? WHERE id=?", at(NOW.minusSeconds(1)), otherRound);
        var empty = as(reviewer, get(path()).param("roundId", Long.toString(otherRound))); ok(empty);
        assertEquals(0, json(empty).path("items").size()); assertEquals(0, json(empty).path("page").path("totalElements").asInt());
        ok(as(reviewer, get(path()).param("q", "😀".repeat(200))));
        problem(as(reviewer, get(path()).param("q", "😀".repeat(201))), 400, "VALIDATION_FAILED", null);
        assertEquals(1, json(as(reviewer, get(path()).param("q", "   "))).path("items").size());
    }

    @Test void selfReviewAppearingAfterAReadHidesTheEntireRoundOnNextRequest() throws Exception {
        ok(as(reviewer, get(path())));
        long own = application(round, club, reviewer);
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?", own);
        var filtered = as(reviewer, get(path())); ok(filtered);
        assertEquals(0, json(filtered).path("items").size()); assertEquals(0, json(filtered).path("page").path("totalElements").asInt());
        problem(as(reviewer, get(path() + "/" + application)), 403, "ACCESS_DENIED", null);
    }

    @Test void committeeOfBothClubsStillCannotMixParentAndApplicationIds() throws Exception {
        assign(reviewer, otherClub);
        long foreign = application(otherClubRound, otherClub, student("Private foreign name"));
        problem(as(reviewer, get(path() + "/" + foreign)), 403, "ACCESS_DENIED", null);
        problem(as(reviewer, get(path()).param("roundId", Long.toString(otherClubRound))), 403, "ACCESS_DENIED", null);
        ok(as(reviewer, get("/api/v1/clubs/" + otherClub + "/applications/" + foreign)));
    }

    @Test void unimplementedRoundScopedReadsAreNotExposedAsAliases() throws Exception {
        var oldList = as(reviewer, get("/api/v1/rounds/" + round + "/applications"));
        problem(oldList, 405, "METHOD_NOT_ALLOWED", null);
        assertTrue(oldList.getResponse().getHeader("Allow").contains("POST"));
        problem(as(reviewer, get("/api/v1/rounds/" + round + "/applications/" + application)), 404, "RESOURCE_NOT_FOUND", null);
    }

    @ParameterizedTest @ValueSource(strings = {"SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED"})
    void exactStatusAndRoundFiltersExcludeOtherStatesRoundsAndClubs(String state) throws Exception {
        setState(application, state);
        long other = application(round, club, student("Different status"));
        setState(other, state.equals("SUBMITTED") ? "UNDER_REVIEW" : "SUBMITTED");
        setState(application(otherRound, club, student("Different round")), state);
        setState(application(otherClubRound, otherClub, student("Different club")), state);
        var result = as(reviewer, get(path()).param("roundId", Long.toString(round)).param("status", state)); ok(result);
        var body = json(result);
        assertEquals(1, body.path("items").size()); assertEquals(1, body.path("page").path("totalElements").asInt());
        assertEquals(1, body.path("page").path("totalPages").asInt());
        assertEquals(Long.toString(application), body.path("items").get(0).path("id").asText());
        assertEquals(Long.toString(round), body.path("items").get(0).path("roundId").asText());
        assertEquals(state, body.path("items").get(0).path("status").asText());
    }

    @Test void manyPagesWithMultipleAnswersAndLinksDoNotDuplicateOrLoseApplications() throws Exception {
        long q1 = question(round, "First", true, 1), q2 = question(round, "Second", false, 2);
        List<Long> expected = new ArrayList<>(List.of(application));
        for (int i = 0; i < 6; i++) expected.add(application(round, club, student("Page applicant " + i)));
        for (long id : expected) {
            answer(id, round, q1, "First answer"); answer(id, round, q2, "Second answer");
            for (int i = 1; i <= 2; i++) jdbc.update("INSERT INTO application_links(application_id,label,url,display_order) VALUES (?,'Portfolio','https://example.org/portfolio',?)", id, i);
        }
        application(otherClubRound, otherClub, student("Foreign excluded"));
        List<Long> received = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            var result = as(reviewer, get(path()).param("roundId", Long.toString(round)).param("size", "3").param("page", Integer.toString(page))); ok(result);
            var body = json(result);
            assertEquals(7, body.path("page").path("totalElements").asInt()); assertEquals(3, body.path("page").path("totalPages").asInt());
            assertEquals(page == 2 ? 1 : 3, body.path("items").size());
            for (var item : body.path("items")) received.add(Long.parseLong(item.path("id").asText()));
        }
        assertEquals(expected, received); assertEquals(7, new HashSet<>(received).size());
        var empty = as(reviewer, get(path()).param("page", "3").param("size", "3")); ok(empty);
        assertEquals(0, json(empty).path("items").size()); assertEquals(7, json(empty).path("page").path("totalElements").asInt());
    }

    @Test void detailCannotMixAnotherApplicantAnswersOrDocumentsFromTheSameRound() throws Exception {
        long question = question(round, "Shared question", true, 1);
        long other = application(round, club, student("PRIVATE-OTHER-APPLICANT"));
        answer(application, round, question, "TARGET-ANSWER"); answer(other, round, question, "PRIVATE-OTHER-ANSWER");
        long link = jdbc.queryForObject("INSERT INTO application_links(application_id,label,url,display_order) VALUES (?,'Target','https://example.org/target',1) RETURNING id", Long.class, application);
        jdbc.update("INSERT INTO application_links(application_id,label,url,display_order) VALUES (?,'PRIVATE-OTHER-LINK','https://example.org/private-other',1)", other);
        var result = as(reviewer, get(path() + "/" + application)); ok(result);
        var body = json(result);
        assertEquals(Long.toString(applicant), body.path("applicant").path("userId").asText());
        assertEquals(1, body.path("questionsWithAnswers").size());
        assertEquals(Long.toString(question), body.path("questionsWithAnswers").get(0).path("questionId").asText());
        assertEquals("TARGET-ANSWER", body.path("questionsWithAnswers").get(0).path("answerText").asText());
        assertEquals(1, body.path("links").size()); assertEquals(Long.toString(link), body.path("links").get(0).path("id").asText());
        assertEquals("https://example.org/target", body.path("links").get(0).path("url").asText());
        assertFalse(result.getResponse().getContentAsString().contains("PRIVATE-OTHER"));
    }

    @Test void httpReadUsesItsOwnReadOnlyRepeatableSnapshotWithCommittedFixtures() throws Exception {
        commitFixtures();
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        var readerPid = new AtomicReference<Integer>();
        TransactionExecutionListener listener = new TransactionExecutionListener() {
            @Override public void afterBegin(TransactionExecution transaction, Throwable failure) {
                if (failure == null && (com.tu.clubhub.application.service.CommitteeApplicationService.class.getName() + ".list").equals(transaction.getTransactionName())) {
                    assertEquals("repeatable read", jdbc.queryForObject("SHOW transaction_isolation", String.class));
                    assertEquals("on", jdbc.queryForObject("SHOW transaction_read_only", String.class));
                    readerPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE club_id=?", Long.class, club));
                    entered.countDown(); await(release);
                }
            }
        };
        var manager = (ConfigurableTransactionManager) transactions; manager.addListener(listener);
        try (var workers = Executors.newSingleThreadExecutor()) {
            var read = workers.submit(() -> as(reviewer, get(path())));
            try {
                await(entered); assertFalse(read.isDone());
                assertNotEquals(readerPid.get(), jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                long added = application(round, club, student("Committed after read snapshot"));
                assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE club_id=?", Long.class, club));
                release.countDown(); var result = read.get(15, TimeUnit.SECONDS); ok(result);
                assertEquals(1, json(result).path("page").path("totalElements").asInt());
                assertEquals(1, json(result).path("items").size());
                assertEquals(Long.toString(application), json(result).path("items").get(0).path("id").asText());
                assertNotEquals(application, added);
            } finally { release.countDown(); removeListener(listener); }
        }
        var refreshed = as(reviewer, get(path())); ok(refreshed);
        assertEquals(2, json(refreshed).path("page").path("totalElements").asInt());
        assertEquals(2, json(refreshed).path("items").size());
    }

    @Test void realSessionLosesPermissionAfterCommittedRevocationBetweenFreshHttpTransactions() throws Exception {
        var session = storedSession(sessions, reviewer);
        Cookie cookie = new Cookie("SESSION", Base64.getEncoder().encodeToString(session.getId().getBytes(StandardCharsets.UTF_8)));
        commitFixtures();
        for (String target : List.of(path(), path() + "/" + application)) ok(mvc.perform(get(target).cookie(cookie)).andReturn());
        assertEquals(1, jdbc.update("UPDATE club_committee_assignments SET status='REVOKED',revoked_at=created_at,revoked_by=?,version=version+1 WHERE id=?", otherReviewer, assignment));
        for (String target : List.of(path(), path() + "/" + application))
            problem(mvc.perform(get(target).cookie(cookie)).andReturn(), 403, "ACCESS_DENIED", null);
        assertNotNull(sessions.findById(session.getId()), "Club revocation must not log out the user globally");
    }

    private void commitFixtures() {
        assertTrue(TestTransaction.isActive()); committedFixtures = true;
        TestTransaction.flagForCommit(); TestTransaction.end();
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
    }
    private void removeListener(TransactionExecutionListener listener) {
        var manager = (ConfigurableTransactionManager) transactions;
        var listeners = new ArrayList<>(manager.getTransactionExecutionListeners()); listeners.remove(listener);
        manager.setTransactionExecutionListeners(listeners);
    }
    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(15, TimeUnit.SECONDS), "Read coordination timed out"); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IllegalStateException(error); }
    }
    private void setState(long application, String state) {
        boolean decision = Set.of("ACCEPTED", "REJECTED", "CONFIRMED", "DECLINED", "EXPIRED").contains(state);
        jdbc.update("UPDATE applications SET status=?,decided_by=?,decided_at=?,responded_at=? WHERE id=?", state,
                decision ? reviewer : null, decision ? at(NOW) : null,
                Set.of("CONFIRMED", "DECLINED").contains(state) ? at(NOW) : null, application);
    }

    private <S extends Session> S storedSession(SessionRepository<S> repository, long userId) {
        S session = repository.createSession();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(userId, "fictional", "USER"), null, List.of()));
        session.setAttribute("SPRING_SECURITY_CONTEXT", context);
        repository.save(session);
        fixtureSessions.add(session.getId());
        return session;
    }
    private static <S extends Session> void expireSession(SessionRepository<S> repository, String id) {
        S session = repository.findById(id);
        assertNotNull(session);
        session.setMaxInactiveInterval(Duration.ofSeconds(1));
        session.setLastAccessedTime(Instant.now().minusSeconds(60));
        repository.save(session);
    }

    private String path() { return "/api/v1/clubs/" + club + "/applications"; }
    private MvcResult as(long user, MockHttpServletRequestBuilder request) throws Exception {
        String role = jdbc.queryForObject("SELECT system_role FROM users WHERE id=?", String.class, user);
        return mvc.perform(request.with(authentication(UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(user, "fictional", role), null, List.of())))).andReturn();
    }
    private JsonNode json(MvcResult result) throws Exception { return mapper.readTree(result.getResponse().getContentAsByteArray()); }
    private void ok(MvcResult result) throws Exception {
        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));
    }
    private void problem(MvcResult result, int status, String code, String reason) throws Exception {
        assertEquals(status, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        assertTrue(result.getResponse().getContentType().startsWith("application/problem+json"));
        var body = json(result); assertEquals(code, body.path("code").asText());
        assertEquals(reason, body.has("reason") ? body.path("reason").asText() : null);
        assertFalse(body.path("traceId").asText().isBlank());
        assertFalse(result.getResponse().getContentAsString().contains("SELECT "));
        assertFalse(result.getResponse().getContentAsString().contains("Private foreign name"));
    }
    private long student(String name) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        long user = jdbc.queryForObject("INSERT INTO users(tu_username,display_name) VALUES (?,?) RETURNING id", Long.class, "t65-" + suffix, name);
        fixtureUsers.add(user);
        jdbc.update("INSERT INTO student_profiles(user_id,student_code,student_status) VALUES (?,?,'ACTIVE')", user, "s" + suffix.substring(0, 15));
        return user;
    }
    private long club() {
        long id = jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,created_by) VALUES (?,?,'Fictional club',?) RETURNING id", Long.class, category, "t65-" + UUID.randomUUID(), reviewer);
        fixtureClubs.add(id); return id;
    }
    private long assign(long user, long club) {
        long membership = jdbc.queryForObject("INSERT INTO club_memberships(club_id,user_id,joined_at) VALUES (?,?,?) RETURNING id", Long.class, club, user, at(NOW.minusSeconds(3600)));
        return jdbc.queryForObject("""
                INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,assigned_by)
                VALUES (?,'Committee','COMMITTEE',?,?,?) RETURNING id
                """, Long.class, membership, at(NOW.minusSeconds(600)), at(NOW.plusSeconds(3600)), reviewer);
    }
    private long round(long club, String state) { return jdbc.queryForObject("""
            INSERT INTO recruitment_rounds(club_id,title,academic_year,semester,description,publication_status,
                published_at,opens_at,closes_at,confirmation_deadline,created_by)
            VALUES (?,'Task65 round',2569,1,'Fictional round',?,?,?,?,?,?) RETURNING id
            """, Long.class, club, state, state.equals("DRAFT") ? null : at(NOW.minusSeconds(3600)),
            at(NOW.minusSeconds(1800)), at(NOW.plusSeconds(3600)), at(NOW.plusSeconds(7200)), reviewer); }
    private long application(long round, long club, long applicant) {
        long app = jdbc.queryForObject("INSERT INTO applications(round_id,club_id,applicant_id,motivation,submitted_at) VALUES (?,?,?,'Fictional motivation',?) RETURNING id", Long.class, round, club, applicant, at(NOW));
        jdbc.update("INSERT INTO application_status_history(application_id,to_status,actor_id,changed_at) VALUES (?,'SUBMITTED',?,?)", app, applicant, at(NOW));
        return app;
    }
    private long question(long round, String text, boolean required, int order) { return jdbc.queryForObject("INSERT INTO application_questions(round_id,prompt,is_required,display_order) VALUES (?,?,?,?) RETURNING id", Long.class, round, text, required, order); }
    private void answer(long app, long round, long question, String text) { jdbc.update("INSERT INTO application_answers(application_id,round_id,question_id,answer_text) VALUES (?,?,?,?)", app, round, question, text); }
    private Map<String, List<Map<String, Object>>> rows() {
        var snapshot = new java.util.LinkedHashMap<String, List<Map<String, Object>>>();
        for (String table : List.of("applications", "application_answers", "application_links", "application_reviews", "application_status_history", "recruitment_rounds"))
            snapshot.put(table, jdbc.queryForList("SELECT * FROM " + table + " ORDER BY id"));
        return snapshot;
    }
    private static java.time.OffsetDateTime at(Instant value) { return value.atOffset(ZoneOffset.UTC); }
    @TestConfiguration static class Configuration { @Bean @Primary Clock committeeReadClock() { return Clock.fixed(NOW, ZoneOffset.UTC); } }
}
