package com.tu.clubhub.application;

import com.tu.clubhub.application.dto.ApplicationAnswerInput;
import com.tu.clubhub.application.dto.ApplicationLinkInput;
import com.tu.clubhub.application.dto.ApplicationSubmission;
import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.repository.ApplicationRepository;
import com.tu.clubhub.application.service.ApplicationService;
import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

/** Real PostgreSQL transactions, constraints and row locks; no mocked Service or Repository. */
@SpringBootTest(properties = "spring.datasource.hikari.maximum-pool-size=8")
@ActiveProfiles({"test", "seedtest"})
@Import(ApplicationServiceIntegrationTest.ClockConfiguration.class)
class ApplicationServiceIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-20T09:30:00Z");
    @Autowired private ApplicationService service;
    @Autowired private ApplicationRepository repository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private MutableClock clock;
    @Autowired private tools.jackson.databind.ObjectMapper objectMapper;
    private final List<Long> users = new ArrayList<>();
    private final List<Long> clubs = new ArrayList<>();
    private final List<Long> rounds = new ArrayList<>();
    private long userId;
    private long categoryId;
    private long clubId;
    private long roundId;
    private long questionId;

    @BeforeEach
    void fixtures() {
        clock.set(NOW);
        userId = user("ACTIVE", "ACTIVE");
        categoryId = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id",
                Long.class, "Task43 category " + UUID.randomUUID());
        clubId = club("ACTIVE");
        roundId = round(clubId);
        questionId = question(roundId, true, 2000);
        authenticate(userId);
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        clock.set(NOW);
        for (long user : users) {
            for (String table : List.of("application_status_history", "application_answers", "application_links")) {
                jdbc.update("DELETE FROM " + table + " WHERE application_id IN (SELECT id FROM applications WHERE applicant_id = ?)", user);
            }
            jdbc.update("DELETE FROM club_memberships WHERE user_id = ?", user);
            jdbc.update("DELETE FROM applications WHERE applicant_id = ?", user);
        }
        for (long round : rounds) {
            jdbc.update("DELETE FROM application_questions WHERE round_id = ?", round);
            jdbc.update("DELETE FROM recruitment_rounds WHERE id = ?", round);
        }
        for (long club : clubs) jdbc.update("DELETE FROM clubs WHERE id = ?", club);
        if (categoryId != 0) jdbc.update("DELETE FROM club_categories WHERE id = ?", categoryId);
        for (long user : users) {
            jdbc.update("DELETE FROM student_profiles WHERE user_id = ?", user);
            jdbc.update("DELETE FROM users WHERE id = ?", user);
        }
    }

    @Test
    void commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory() {
        assertTrue(AopUtils.isAopProxy(service), "The test must invoke the transactional Spring proxy");
        var result = service.submit(Long.toString(roundId), new ApplicationSubmissionRequest("  Volunteer 😀  ",
                List.of(new ApplicationAnswerInput(Long.toString(questionId), "  Useful experience  ")),
                List.of(new ApplicationLinkInput(" Portfolio ", "HTTPS://example.org/portfolio"))));
        assertEquals("SUBMITTED", result.status());
        assertEquals(Long.toString(roundId), result.roundId());
        assertEquals(Long.toString(clubId), result.clubId());
        assertEquals(NOW, result.submittedAt());
        var json = objectMapper.valueToTree(result);
        assertEquals(java.util.Set.of("id", "clubId", "roundId", "status", "submittedAt"),
                java.util.Set.copyOf(json.propertyNames()));
        assertTrue(json.get("id").isTextual());
        assertTrue(json.get("clubId").isTextual());
        assertTrue(json.get("roundId").isTextual());
        assertEquals(NOW.toString(), json.get("submittedAt").asString());
        assertEquals(1, clock.reads.get());
        var application = jdbc.queryForMap("SELECT * FROM applications WHERE id = ?", Long.valueOf(result.id()));
        assertEquals(userId, application.get("applicant_id"));
        assertEquals("Volunteer 😀", application.get("motivation"));
        assertEquals("SUBMITTED", application.get("status"));
        assertNull(application.get("decided_by"));
        assertEquals(NOW, timestamp("applications", "submitted_at", result.id()));
        assertEquals(NOW, timestamp("applications", "updated_at", result.id()));
        assertEquals("Useful experience", jdbc.queryForObject(
                "SELECT answer_text FROM application_answers WHERE application_id = ? AND question_id = ? AND round_id = ?",
                String.class, Long.valueOf(result.id()), questionId, roundId));
        assertEquals("Portfolio", jdbc.queryForObject("SELECT label FROM application_links WHERE application_id = ?",
                String.class, Long.valueOf(result.id())));
        assertEquals("HTTPS://example.org/portfolio", jdbc.queryForObject("SELECT url FROM application_links WHERE application_id = ?",
                String.class, Long.valueOf(result.id())));
        assertEquals(1, jdbc.queryForObject("SELECT display_order FROM application_links WHERE application_id = ?",
                Integer.class, Long.valueOf(result.id())));
        var history = jdbc.queryForMap("SELECT * FROM application_status_history WHERE application_id = ?", Long.valueOf(result.id()));
        assertNull(history.get("from_status"));
        assertNull(history.get("reason"));
        assertEquals("SUBMITTED", history.get("to_status"));
        assertEquals(userId, history.get("actor_id"));
        assertEquals(NOW, jdbc.queryForObject("SELECT changed_at FROM application_status_history WHERE application_id = ?",
                java.time.OffsetDateTime.class, Long.valueOf(result.id())).toInstant());
        assertEquals(1, countHistory());
        assertEquals(0, count("club_memberships"));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE application_id = ?",
                Long.class, Long.valueOf(result.id())));
    }

    @Test
    void allowsNoCustomQuestionsAndNoDocumentLinks() {
        jdbc.update("DELETE FROM application_questions WHERE round_id = ?", roundId);
        var result = service.submit(Long.toString(roundId), new ApplicationSubmissionRequest("Volunteer", List.of(), List.of()));
        assertEquals("SUBMITTED", result.status());
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM application_answers WHERE application_id = ?", Long.class, Long.valueOf(result.id())));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM application_links WHERE application_id = ?", Long.class, Long.valueOf(result.id())));
        assertEquals(1, countHistory());
    }

    @Test
    void rejectsMissingAnonymousUnauthenticatedAndForeignPrincipal() {
        SecurityContextHolder.clearContext();
        error(401, "AUTHENTICATION_REQUIRED", null, request());
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("test", "anonymousUser",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        error(401, "AUTHENTICATION_REQUIRED", null, request());
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.unauthenticated(
                new ClubHubPrincipal(userId, "fake-client-name", "ADMIN"), null));
        error(401, "AUTHENTICATION_REQUIRED", null, request());
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "foreign principal", null, List.of()));
        error(401, "AUTHENTICATION_REQUIRED", null, request());
        assertNoSubmission();
    }

    @ParameterizedTest
    @ValueSource(strings = {"INACTIVE", "GRADUATED", "UNKNOWN", "MISSING"})
    void rejectsInactiveOrMissingStudentProfileEvenForAdmin(String status) {
        if (status.equals("MISSING")) jdbc.update("DELETE FROM student_profiles WHERE user_id = ?", userId);
        else jdbc.update("UPDATE student_profiles SET student_status = ? WHERE user_id = ?", status, userId);
        error(403, "ACCESS_DENIED", null, request());
        assertNoSubmission();
    }

    @Test
    void rechecksCurrentAccountStatusAndDoesNotTrustPrincipalRole() {
        jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", userId);
        error(403, "ACCOUNT_NOT_ALLOWED", null, request());
        assertNoSubmission();
    }

    @Test
    void hidesMissingRoundInactiveClubAndNeverPublishedRound() {
        var missing = assertThrows(ApplicationSubmissionException.class,
                () -> service.submit(Long.toString(Long.MAX_VALUE), request()));
        assertEquals(404, missing.status());
        assertEquals("RESOURCE_NOT_FOUND", missing.code());
        jdbc.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubId);
        error(404, "RESOURCE_NOT_FOUND", null, request());
        jdbc.update("UPDATE clubs SET status = 'ACTIVE' WHERE id = ?", clubId);
        jdbc.update("UPDATE recruitment_rounds SET publication_status = 'DRAFT', published_at = NULL WHERE id = ?", roundId);
        error(404, "RESOURCE_NOT_FOUND", null, request());
        assertNoSubmission();
    }

    @ParameterizedTest
    @CsvSource({"-1,true", "0,true", "59,true", "60,false", "61,false"})
    void openingIsInclusiveAndClosingIsExclusive(int seconds, boolean accepted) {
        // Opens NOW-1, closes NOW+60; the clock is the only changing input.
        jdbc.update("UPDATE recruitment_rounds SET opens_at = ? WHERE id = ?", NOW.minusSeconds(1).atOffset(ZoneOffset.UTC), roundId);
        clock.set(NOW.plusSeconds(seconds));
        if (accepted) assertEquals("SUBMITTED", service.submit(Long.toString(roundId), request()).status());
        else error(409, "RESOURCE_CONFLICT", "ROUND_CLOSED", request());
    }

    @Test
    void rejectsNotYetOpenManuallyClosedAndPreviouslyPublishedCancelledRounds() {
        clock.set(NOW.minusSeconds(61));
        error(409, "RESOURCE_CONFLICT", "ROUND_NOT_OPEN", request());
        clock.set(NOW);
        jdbc.update("UPDATE recruitment_rounds SET closed_at = ? WHERE id = ?", NOW.minusSeconds(1).atOffset(ZoneOffset.UTC), roundId);
        error(409, "RESOURCE_CONFLICT", "ROUND_CLOSED", request());
        jdbc.update("UPDATE recruitment_rounds SET publication_status = 'CANCELLED' WHERE id = ?", roundId);
        error(409, "RESOURCE_CONFLICT", "ROUND_CANCELLED", request());
        assertNoSubmission();
    }

    @Test
    void rejectsRequiredMissingBlankForeignDuplicateAndOverlongAnswersWithoutPartialWrites() {
        error(400, "VALIDATION_FAILED", null, new ApplicationSubmissionRequest("Volunteer", List.of(), List.of()));
        for (String text : List.of(" ", "\u00a0\t", "x".repeat(2001))) {
            error(400, "VALIDATION_FAILED", null, answer(questionId, text));
        }
        long foreignQuestion = question(round(clubId), false, 2000);
        for (long unknown : List.of(foreignQuestion, Long.MAX_VALUE)) {
            error(400, "VALIDATION_FAILED", null, answer(unknown, "answer"));
        }
        error(400, "VALIDATION_FAILED", null, new ApplicationSubmissionRequest("Volunteer", List.of(
                new ApplicationAnswerInput(Long.toString(questionId), "one"),
                new ApplicationAnswerInput(Long.toString(questionId), "two")), List.of()));
        assertNoSubmission();
    }

    @Test
    void countsAnswerLengthBeforeTrimmingAndAllowsOptionalOmission() {
        jdbc.update("UPDATE application_questions SET max_length = 1 WHERE id = ?", questionId);
        question(roundId, false, 100);
        error(400, "VALIDATION_FAILED", null, answer(questionId, " 😀 "));
        var result = service.submit(Long.toString(roundId), answer(questionId, "😀"));
        assertEquals("😀", jdbc.queryForObject("SELECT answer_text FROM application_answers WHERE application_id = ?",
                String.class, Long.valueOf(result.id())));
    }

    @Test
    void rejectsDuplicateIncludingWithdrawnApplicationsAndPreservesOriginalHistory() {
        var original = service.submit(Long.toString(roundId), request());
        error(409, "RESOURCE_CONFLICT", "APPLICATION_ALREADY_EXISTS", request());
        jdbc.update("UPDATE applications SET status = 'WITHDRAWN' WHERE id = ?", Long.valueOf(original.id()));
        error(409, "RESOURCE_CONFLICT", "APPLICATION_ALREADY_EXISTS", request());
        assertEquals(1, count("applications"));
        assertEquals(1, countHistory());
    }

    @Test
    void priorApplicationInAnotherRoundDoesNotCountAsDuplicate() {
        var first = service.submit(Long.toString(roundId), request());
        long nextRound = round(clubId);
        var second = service.submit(Long.toString(nextRound),
                new ApplicationSubmissionRequest("Another round", List.of(), List.of()));
        assertNotEquals(first.id(), second.id());
        assertEquals(Long.toString(nextRound), second.roundId());
        assertEquals(2, count("applications"));
        assertEquals(2, countHistory());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED"})
    void allPersistedApplicationStatesPreventSameRoundReapplication(String status) {
        var original = service.submit(Long.toString(roundId), request());
        setApplicationStatus(original.id(), status);
        error(409, "RESOURCE_CONFLICT", "APPLICATION_ALREADY_EXISTS", request());
        assertEquals(1, count("applications"));
        assertEquals(1, countHistory());
        assertEquals(status, jdbc.queryForObject("SELECT status FROM applications WHERE id = ?",
                String.class, Long.valueOf(original.id())));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED"})
    void applicationStateAloneDoesNotConsumeMembershipQuota(String status) {
        for (int i = 0; i < 4; i++) membership(userId, club("ACTIVE"), "ACTIVE", NOW.minusSeconds(1), null);
        long otherRound = round(clubId);
        var prior = service.submit(Long.toString(otherRound),
                new ApplicationSubmissionRequest("Prior round", List.of(), List.of()));
        // Fixture state only: quota is based on actual memberships, not inferred from application status.
        setApplicationStatus(prior.id(), status);
        var current = service.submit(Long.toString(roundId), request());
        assertEquals("SUBMITTED", current.status());
        assertEquals(2, count("applications"));
        assertEquals(2, countHistory());
        assertEquals(4, count("club_memberships"));
    }

    @Test
    void forbiddenApplicantAndStatusFieldsCannotCreateOrAssignApplications() {
        long otherUser = user("ACTIVE", "ACTIVE");
        for (String field : List.of("applicantId", "userId", "status", "score", "roundId", "clubId")) {
            String value = field.equals("status") ? "APPROVED" : Long.toString(otherUser);
            String json = "{\"motivation\":\"Volunteer\",\"answers\":[],\"links\":[],\"" + field + "\":\"" + value + "\"}";
            Exception error = assertThrows(Exception.class,
                    () -> objectMapper.readValue(json, ApplicationSubmissionRequest.class));
            Throwable cause = error;
            while (cause.getCause() != null) cause = cause.getCause();
            var validation = assertInstanceOf(ApplicationSubmissionException.class, cause);
            assertEquals(400, validation.status());
            assertEquals("VALIDATION_FAILED", validation.code());
            assertNoSubmission();
        }
        var result = service.submit(Long.toString(roundId), request());
        assertEquals(userId, jdbc.queryForObject("SELECT applicant_id FROM applications WHERE id = ?",
                Long.class, Long.valueOf(result.id())));
        assertEquals("SUBMITTED", result.status());
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE applicant_id = ?", Long.class, otherUser));
    }

    @Test
    void rejectsExistingTargetMembershipBeforeMembershipLimit() {
        membership(userId, clubId, "ACTIVE", NOW.minusSeconds(1), null);
        for (int i = 0; i < 4; i++) membership(userId, club("ACTIVE"), "ACTIVE", NOW.minusSeconds(1), null);
        error(409, "RESOURCE_CONFLICT", "ALREADY_MEMBER", request());
        assertNoSubmission();
    }

    @Test
    void rejectsFiveEffectiveMembershipsAcrossAllClubTypes() {
        for (int i = 0; i < 5; i++) {
            long club = club("ACTIVE");
            jdbc.update("UPDATE clubs SET affiliation_level = ? WHERE id = ?", i % 2 == 0 ? "Faculty" : "University", club);
            membership(userId, club, "ACTIVE", NOW.minusSeconds(1), null);
        }
        error(409, "RESOURCE_CONFLICT", "MEMBERSHIP_LIMIT_REACHED", request());
        assertNoSubmission();
    }

    @Test
    void ignoresInactiveEndedFutureMembershipsAndPendingApplicationsInLimit() {
        membership(userId, club("ACTIVE"), "INACTIVE", NOW.minusSeconds(1), null);
        membership(userId, club("ACTIVE"), "LEFT", NOW.minusSeconds(10), NOW.minusSeconds(1));
        membership(userId, club("ACTIVE"), "ACTIVE", NOW.plusSeconds(1), null);
        for (int i = 0; i < 6; i++) {
            long otherRound = round(club("ACTIVE"));
            service.submit(Long.toString(otherRound), new ApplicationSubmissionRequest("Volunteer", List.of(), List.of()));
        }
        assertEquals("SUBMITTED", service.submit(Long.toString(roundId), request()).status());
        assertEquals(7, count("applications"));
        assertEquals(3, count("club_memberships"), "Submission must not create membership records");
    }

    @Test
    void invalidUrlProducesIndexedValidationErrorWithoutWriting() {
        var invalid = new ApplicationSubmissionRequest("Volunteer", request().answers(),
                List.of(new ApplicationLinkInput("Portfolio", "http://example.org")));
        var error = error(400, "VALIDATION_FAILED", null, invalid);
        assertTrue(error.fieldErrors().stream().anyMatch(field -> field.field().equals("links[0].url")));
        assertNoSubmission();
    }

    @Test
    void historyFailureRollsBackApplicationAnswersAndLinks() {
        jdbc.execute("ALTER TABLE application_status_history ADD CONSTRAINT task43_history_failure CHECK (actor_id <> " + userId + ")");
        try {
            var input = new ApplicationSubmissionRequest("Volunteer", request().answers(),
                    List.of(new ApplicationLinkInput("Portfolio", "https://example.org/portfolio")));
            assertThrows(DataIntegrityViolationException.class, () -> service.submit(Long.toString(roundId), input));
            assertNoSubmission();
        } finally {
            jdbc.execute("ALTER TABLE application_status_history DROP CONSTRAINT task43_history_failure");
        }
    }

    @Test
    void answerFailureMidwayRollsBackEarlierAnswersAndApplication() {
        long secondQuestion = question(roundId, false, 100);
        jdbc.execute("ALTER TABLE application_answers ADD CONSTRAINT task43_answer_failure CHECK (answer_text <> 'forcefailure' OR round_id <> " + roundId + ")");
        try {
            var input = new ApplicationSubmissionRequest("Volunteer", List.of(
                    new ApplicationAnswerInput(Long.toString(questionId), "This answer inserts first"),
                    new ApplicationAnswerInput(Long.toString(secondQuestion), "forcefailure")), List.of());
            assertThrows(DataIntegrityViolationException.class,
                    () -> service.submit(Long.toString(roundId), input));
            assertNoSubmission();
        } finally {
            jdbc.execute("ALTER TABLE application_answers DROP CONSTRAINT task43_answer_failure");
        }
    }

    @Test
    void databaseUniqueConstraintIsFinalDuplicateSafeguardAndClassifierIsSpecific() {
        service.submit(Long.toString(roundId), request());
        var error = assertThrows(DuplicateKeyException.class, () -> transaction().execute(status ->
                repository.insertApplication(roundId, clubId, userId, "duplicate", NOW)));
        assertTrue(ApplicationRepository.isRoundApplicantConflict(error));
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("other",
                new java.sql.SQLException("violates unique constraint \"another_key\"", "23505"))));
        assertFalse(ApplicationRepository.isRoundApplicantConflict(new DuplicateKeyException("other",
                new java.sql.SQLException("\"uq_applications_round_applicant\"", "23503"))));
        assertEquals(1, count("applications"));
        assertEquals(1, countHistory());
    }

    @Test
    void concurrentSameApplicantProducesOneApplicationAndOneHistoryOnSeparateConnections() throws Exception {
        var results = simultaneous(userId, userId);
        assertNotEquals(results.get(0).backendPid(), results.get(1).backendPid());
        assertEquals(1L, results.stream().filter(result -> result.receipt() != null).count());
        var rejected = results.stream().filter(result -> result.error() != null).findFirst().orElseThrow().error();
        assertEquals("APPLICATION_ALREADY_EXISTS", rejected.reason());
        assertEquals(409, rejected.status());
        assertEquals(1, count("applications"));
        assertEquals(1, countHistory());
        assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM application_answers WHERE round_id = ?", Long.class, roundId));
    }

    @Test
    void differentApplicantsMaySubmitConcurrentlyWithoutInventedSeatQuota() throws Exception {
        long other = user("ACTIVE", "ACTIVE");
        for (int i = 0; i < 4; i++) {
            long club = club("ACTIVE");
            membership(userId, club, "ACTIVE", NOW.minusSeconds(1), null);
            membership(other, club, "ACTIVE", NOW.minusSeconds(1), null);
        }
        var results = simultaneous(userId, other);
        assertNotEquals(results.get(0).backendPid(), results.get(1).backendPid());
        for (var result : results) {
            assertNull(result.error());
            assertEquals("SUBMITTED", result.receipt().status());
        }
        assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE round_id = ?", Long.class, roundId));
        assertEquals(2, countHistory());
        for (long applicant : List.of(userId, other)) {
            assertEquals(4L, jdbc.queryForObject("SELECT COUNT(*) FROM club_memberships WHERE user_id = ?", Long.class, applicant));
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock(boolean manualClose) throws Exception {
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var workerEntered = new CountDownLatch(1);
        var workerPid = new AtomicInteger();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transaction().execute(status -> {
                jdbc.queryForObject("SELECT id FROM recruitment_rounds WHERE id = ? FOR UPDATE", Long.class, roundId);
                locked.countDown();
                await(release);
                if (manualClose) {
                    jdbc.update("UPDATE recruitment_rounds SET closed_at = ? WHERE id = ?",
                            NOW.minusSeconds(1).atOffset(ZoneOffset.UTC), roundId);
                }
                return null;
            }));
            try {
                await(locked);
                Future<Outcome> worker = executor.submit(() -> attempt(userId, workerEntered, new CountDownLatch(0), workerPid));
                await(workerEntered);
                awaitDatabaseBlock(workerPid.get());
                if (!manualClose) clock.set(NOW.plusSeconds(60)); // Exactly closes_at while waiting.
                release.countDown();
                holder.get(10, TimeUnit.SECONDS);
                var result = worker.get(10, TimeUnit.SECONDS);
                assertNotNull(result.error());
                assertEquals("ROUND_CLOSED", result.error().reason());
                assertEquals(1, clock.reads.get());
                assertNoSubmission();
            } finally {
                release.countDown();
            }
        }
    }

    private List<Outcome> simultaneous(long... applicants) throws Exception {
        var ready = new CountDownLatch(applicants.length);
        var start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(applicants.length)) {
            List<Future<Outcome>> futures = new ArrayList<>();
            for (long applicant : applicants) {
                futures.add(executor.submit(() -> attempt(applicant, ready, start, new AtomicInteger())));
            }
            try {
                await(ready); // Both transactions own distinct PostgreSQL connections before submitting.
            } finally {
                start.countDown();
            }
            List<Outcome> results = new ArrayList<>();
            for (Future<Outcome> future : futures) results.add(future.get(10, TimeUnit.SECONDS));
            return results;
        }
    }

    @Test
    void severalEligibleApplicantsCreateIndependentSubmissionsWithoutOrphans() throws Exception {
        long[] applicants = {userId, user("ACTIVE", "ACTIVE"), user("ACTIVE", "ACTIVE"),
                user("ACTIVE", "ACTIVE"), user("ACTIVE", "ACTIVE")};
        var results = simultaneous(applicants);
        assertEquals(applicants.length, results.stream().map(Outcome::backendPid).distinct().count());
        for (var result : results) {
            assertNull(result.error());
            assertNotNull(result.receipt());
            assertEquals("SUBMITTED", result.receipt().status());
            assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM application_status_history WHERE application_id = ?",
                    Long.class, Long.valueOf(result.receipt().id())));
        }
        assertEquals(applicants.length, results.stream().map(result -> result.receipt().id()).distinct().count());
        assertEquals((long) applicants.length, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE round_id = ?", Long.class, roundId));
        assertEquals(applicants.length, countHistory());
        assertEquals(0L, jdbc.queryForObject("""
                SELECT COUNT(*) FROM application_answers answer
                LEFT JOIN applications application ON application.id = answer.application_id
                WHERE application.id IS NULL
                """, Long.class));
    }

    @Test
    void rollbackOfLockHolderLetsWaitingRequestCommitOneCompleteSubmission() throws Exception {
        var written = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var entered = new CountDownLatch(1);
        var pid = new AtomicInteger();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<ApplicationSubmission> rolledBack = executor.submit(() -> {
                authenticate(userId);
                try {
                    return transaction().execute(status -> {
                        var receipt = service.submit(Long.toString(roundId), request());
                        written.countDown();
                        await(release);
                        status.setRollbackOnly();
                        return receipt;
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                await(written);
                var waiting = executor.submit(() -> attempt(userId, entered, new CountDownLatch(0), pid));
                await(entered);
                awaitDatabaseBlock(pid.get());
                release.countDown();
                var abandoned = rolledBack.get(10, TimeUnit.SECONDS);
                var committed = waiting.get(10, TimeUnit.SECONDS);
                assertNull(committed.error());
                assertNotEquals(abandoned.id(), committed.receipt().id());
                assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE id = ?", Long.class, Long.valueOf(abandoned.id())));
                assertEquals(1, count("applications"));
                assertEquals(1, countHistory());
                assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM application_answers WHERE round_id = ?", Long.class, roundId));
            } finally {
                release.countDown();
            }
        }
    }

    private void setApplicationStatus(String applicationId, String status) {
        boolean decided = List.of("ACCEPTED", "REJECTED", "CONFIRMED", "DECLINED", "EXPIRED").contains(status);
        boolean responded = List.of("CONFIRMED", "DECLINED").contains(status);
        jdbc.update("UPDATE applications SET status = ?, decided_by = ?, decided_at = ?, responded_at = ? WHERE id = ?",
                status, decided ? userId : null, decided ? NOW.atOffset(ZoneOffset.UTC) : null,
                responded ? NOW.atOffset(ZoneOffset.UTC) : null, Long.valueOf(applicationId));
    }

    @Test
    void realPostgresLockTimeoutReturnsServiceUnavailableAndRetryCanSucceed() throws Exception {
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var holderPid = new AtomicInteger();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transaction().execute(status -> {
                holderPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.queryForObject("SELECT id FROM recruitment_rounds WHERE id = ? FOR UPDATE", Long.class, roundId);
                locked.countDown();
                await(release);
                return null;
            }));
            DatabaseOutcome result;
            try {
                await(locked);
                result = executor.submit(() -> databaseAttempt("SET LOCAL lock_timeout = '150ms'", null, null))
                        .get(10, TimeUnit.SECONDS);
                assertNotEquals(holderPid.get(), result.backendPid());
                assertNoSubmission();
            } finally {
                release.countDown();
                holder.get(10, TimeUnit.SECONDS);
            }
            assertLockFailure(result, "55P03");
        }
        assertEquals("SUBMITTED", service.submit(Long.toString(roundId), request()).status());
        assertEquals(1, countHistory());
    }

    @Test
    void realPostgresDeadlockVictimReturnsServiceUnavailableAndRetryCanSucceed() throws Exception {
        var roundHeld = new CountDownLatch(1);
        var applicantHeld = new CountDownLatch(1);
        var continueSubmission = new CountDownLatch(1);
        var holderPid = new AtomicInteger();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> holder = executor.submit(() -> transaction().execute(status -> {
                jdbc.execute("SET LOCAL deadlock_timeout = '10s'");
                holderPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.queryForObject("SELECT id FROM recruitment_rounds WHERE id = ? FOR UPDATE", Long.class, roundId);
                roundHeld.countDown();
                await(applicantHeld);
                // Deliberately opposite lock order in this fault-injection transaction.
                jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, userId);
                return null;
            }));
            try {
                await(roundHeld);
                Future<DatabaseOutcome> victim = executor.submit(() -> databaseAttempt(
                        "SET LOCAL deadlock_timeout = '50ms'", applicantHeld, continueSubmission));
                await(applicantHeld);
                awaitDatabaseBlock(holderPid.get());
                continueSubmission.countDown(); // Service now waits for round while the holder waits for this applicant.
                var result = victim.get(10, TimeUnit.SECONDS);
                holder.get(10, TimeUnit.SECONDS);
                assertNotEquals(holderPid.get(), result.backendPid());
                assertNoSubmission();
                assertLockFailure(result, "40P01");
            } finally {
                applicantHeld.countDown();
                continueSubmission.countDown();
            }
        }
        assertEquals("SUBMITTED", service.submit(Long.toString(roundId), request()).status());
        assertEquals(1, countHistory());
    }

    private DatabaseOutcome databaseAttempt(String localSetting, CountDownLatch applicantHeld, CountDownLatch proceed) {
        var pid = new AtomicInteger();
        authenticate(userId);
        try {
            var receipt = transaction().execute(status -> {
                jdbc.execute(localSetting);
                pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                if (applicantHeld != null) {
                    jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, userId);
                    applicantHeld.countDown();
                    await(proceed);
                }
                return service.submit(Long.toString(roundId), request());
            });
            return new DatabaseOutcome(pid.get(), receipt, null);
        } catch (RuntimeException exception) {
            return new DatabaseOutcome(pid.get(), null, exception);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static void assertLockFailure(DatabaseOutcome result, String expectedSqlState) {
        assertNull(result.receipt());
        var error = assertInstanceOf(ApplicationSubmissionException.class, result.error());
        assertEquals(503, error.status());
        assertEquals("SERVICE_UNAVAILABLE", error.code());
        assertNull(error.reason());
        assertFalse(error.getMessage().contains("SELECT"));
        String sqlState = null;
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql) { sqlState = sql.getSQLState(); break; }
        }
        assertEquals(expectedSqlState, sqlState, "The failure must come from a real PostgreSQL lock/deadlock error");
    }

    private record DatabaseOutcome(int backendPid, ApplicationSubmission receipt, RuntimeException error) {}

    @Test
    void rechecksMembershipLimitAfterConcurrentMembershipCommit() throws Exception {
        for (int i = 0; i < 4; i++) {
            membership(userId, club("ACTIVE"), "ACTIVE", NOW.minusSeconds(1), null);
        }
        long fifthClub = club("ACTIVE");
        var locked = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var workerEntered = new CountDownLatch(1);
        var workerPid = new AtomicInteger();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> membershipWriter = executor.submit(() -> transaction().execute(status -> {
                jdbc.queryForObject("SELECT user_id FROM student_profiles WHERE user_id = ? FOR UPDATE", Long.class, userId);
                locked.countDown();
                await(release);
                membership(userId, fifthClub, "ACTIVE", NOW.minusSeconds(1), null);
                return null;
            }));
            try {
                await(locked);
                Future<Outcome> worker = executor.submit(() -> attempt(userId, workerEntered, new CountDownLatch(0), workerPid));
                await(workerEntered);
                awaitDatabaseBlock(workerPid.get());
                release.countDown();
                membershipWriter.get(10, TimeUnit.SECONDS);
                var result = worker.get(10, TimeUnit.SECONDS);
                assertNotNull(result.error());
                assertEquals("MEMBERSHIP_LIMIT_REACHED", result.error().reason());
                assertEquals(5, count("club_memberships"));
                assertNoSubmission();
            } finally {
                release.countDown();
            }
        }
    }

    private Outcome attempt(long applicant, CountDownLatch ready, CountDownLatch start, AtomicInteger pid) {
        authenticate(applicant);
        try {
            var receipt = transaction().execute(status -> {
                pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                ready.countDown();
                await(start);
                return service.submit(Long.toString(roundId), request());
            });
            return new Outcome(pid.get(), receipt, null);
        } catch (ApplicationSubmissionException exception) {
            return new Outcome(pid.get(), null, exception);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void awaitDatabaseBlock(int pid) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT cardinality(pg_blocking_pids(?)) > 0", Boolean.class, pid))) return;
        }
        fail("Worker did not wait for the real PostgreSQL row lock");
    }

    private static void await(CountDownLatch latch) {
        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS), "Timed out coordinating transactions");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private ApplicationSubmissionException error(int status, String code, String reason, ApplicationSubmissionRequest input) {
        var error = assertThrows(ApplicationSubmissionException.class, () -> service.submit(Long.toString(roundId), input));
        assertEquals(status, error.status());
        assertEquals(code, error.code());
        assertEquals(reason, error.reason());
        return error;
    }

    private void assertNoSubmission() {
        assertEquals(0, count("applications"));
        assertEquals(0, countHistory());
        for (String table : List.of("application_answers", "application_links")) {
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE application_id IN "
                    + "(SELECT id FROM applications WHERE applicant_id = ?)", Long.class, userId));
        }
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE "
                + (table.equals("applications") ? "applicant_id" : "user_id") + " = ?", Long.class, userId);
    }

    private long countHistory() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM application_status_history WHERE actor_id IN ("
                + users.stream().map(id -> "?").collect(java.util.stream.Collectors.joining(",")) + ")",
                Long.class, users.toArray());
    }

    private Instant timestamp(String table, String column, String id) {
        return jdbc.queryForObject("SELECT " + column + " FROM " + table + " WHERE id = ?",
                java.time.OffsetDateTime.class, Long.valueOf(id)).toInstant();
    }

    private ApplicationSubmissionRequest request() { return answer(questionId, "Useful experience"); }
    private ApplicationSubmissionRequest answer(long question, String text) {
        return new ApplicationSubmissionRequest("Volunteer", List.of(new ApplicationAnswerInput(Long.toString(question), text)), List.of());
    }
    private TransactionTemplate transaction() { return new TransactionTemplate(transactionManager); }

    private static void authenticate(long id) {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(id, "untrusted-name-is-not-used", "ADMIN"), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    private long user(String account, String student) {
        long id = jdbc.queryForObject("INSERT INTO users(tu_username, display_name, account_status) VALUES (?, 'Task43 test', ?) RETURNING id",
                Long.class, "task43-" + UUID.randomUUID(), account);
        users.add(id);
        jdbc.update("INSERT INTO student_profiles(user_id, student_code, student_status) VALUES (?, ?, ?)",
                id, "s" + UUID.randomUUID().toString().replace("-", "").substring(0, 18), student);
        return id;
    }

    private long club(String status) {
        long id = jdbc.queryForObject("INSERT INTO clubs(category_id, name, description, status, created_by) VALUES (?, ?, 'Task43 club', ?, ?) RETURNING id",
                Long.class, categoryId, "Task43 " + UUID.randomUUID(), status, userId);
        clubs.add(id);
        return id;
    }

    private long round(long club) {
        long id = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds(club_id, title, academic_year, semester, description,
                    publication_status, published_at, opens_at, closes_at, confirmation_deadline, created_by)
                VALUES (?, 'Task43 round', 2569, 1, 'Public details', 'PUBLISHED', ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, club, NOW.minusSeconds(120).atOffset(ZoneOffset.UTC), NOW.minusSeconds(60).atOffset(ZoneOffset.UTC),
                NOW.plusSeconds(60).atOffset(ZoneOffset.UTC), NOW.plusSeconds(3600).atOffset(ZoneOffset.UTC), userId);
        rounds.add(id);
        return id;
    }

    private long question(long round, boolean required, int maxLength) {
        return jdbc.queryForObject("""
                INSERT INTO application_questions(round_id, prompt, is_required, display_order, max_length)
                VALUES (?, 'Describe your experience', ?, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM application_questions WHERE round_id = ?), ?)
                RETURNING id
                """, Long.class, round, required, round, maxLength);
    }

    private void membership(long user, long club, String status, Instant joined, Instant ended) {
        jdbc.update("INSERT INTO club_memberships(user_id, club_id, status, joined_at, ended_at) VALUES (?, ?, ?, ?, ?)",
                user, club, status, joined.atOffset(ZoneOffset.UTC), ended == null ? null : ended.atOffset(ZoneOffset.UTC));
    }

    private record Outcome(int backendPid, ApplicationSubmission receipt, ApplicationSubmissionException error) {}

    static final class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(NOW);
        final AtomicInteger reads = new AtomicInteger();
        void set(Instant instant) { now.set(instant); reads.set(0); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { reads.incrementAndGet(); return now.get(); }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ClockConfiguration {
        @Bean @Primary MutableClock submissionTestClock() { return new MutableClock(); }
    }
}
