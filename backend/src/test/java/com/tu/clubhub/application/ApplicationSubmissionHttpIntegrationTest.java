package com.tu.clubhub.application;

import com.tu.clubhub.application.service.ApplicationService;
import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.auth.dto.LoginResponse;
import com.tu.clubhub.auth.integration.tu.TuAuthClient;
import com.tu.clubhub.auth.integration.tu.TuAuthUser;
import com.tu.clubhub.config.AbsoluteSessionTimeoutFilter;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.ConfigurableTransactionManager;
import org.springframework.transaction.TransactionExecution;
import org.springframework.transaction.TransactionExecutionListener;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Task45: real HTTP handlers, security filters, JDBC sessions, transactional service and PostgreSQL. */
@SpringBootTest(properties = {
        "spring.datasource.hikari.maximum-pool-size=12",
        "spring.datasource.hikari.connection-timeout=5000",
        "spring.datasource.hikari.connection-init-sql=SET statement_timeout = '20s'"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
@Import(ApplicationSubmissionHttpIntegrationTest.HttpConfiguration.class)
class ApplicationSubmissionHttpIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-21T09:30:00Z");
    private static final String PASSWORD = "fictional-test-credential";
    private static final ThreadLocal<String> REQUEST = new ThreadLocal<>();
    private static final ThreadLocal<Runnable> TRANSACTION_BEGIN = new ThreadLocal<>();
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager transactions;
    @Autowired SessionRepository<?> sessions;
    @Autowired ControlledClock clock;
    @Autowired FixtureIdentities identities;
    @Autowired ApplicationService service;
    private final List<Long> users = new ArrayList<>();
    private final List<Long> clubs = new ArrayList<>();
    private final List<Long> rounds = new ArrayList<>();
    private final Set<String> sessionIds = new HashSet<>();
    private long userId, categoryId, clubId, roundId, firstQuestion, secondQuestion, unrelatedApplicant;
    private Client client;
    private final TransactionExecutionListener transactionProbe = new TransactionExecutionListener() {
        @Override public void afterBegin(TransactionExecution transaction, Throwable failure) {
            if (failure == null && (ApplicationService.class.getName() + ".submit").equals(transaction.getTransactionName())) {
                Runnable action = TRANSACTION_BEGIN.get();
                if (action != null) action.run();
            }
        }
    };

    @BeforeEach
    void fixtures() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive(), "Fixtures must commit before workers start");
        assertTrue(AopUtils.isAopProxy(service));
        assertEquals("PostgreSQL", jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)
                connection -> connection.getMetaData().getDatabaseProductName()));
        clock.reset();
        userId = student();
        categoryId = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id",
                Long.class, "Task45 " + UUID.randomUUID());
        clubId = club();
        roundId = round();
        firstQuestion = question(roundId);
        secondQuestion = question(roundId);
        client = login(userId);
        // Test-only instrumentation of the real service-owned transaction, never an outer HTTP transaction.
        ((ConfigurableTransactionManager) transactions).addListener(transactionProbe);
    }

    @AfterEach
    void cleanup() {
        clock.release();
        REQUEST.remove();
        TRANSACTION_BEGIN.remove();
        var manager = (ConfigurableTransactionManager) transactions;
        var listeners = new ArrayList<>(manager.getTransactionExecutionListeners());
        listeners.remove(transactionProbe);
        manager.setTransactionExecutionListeners(listeners);
        dropFailure();
        for (String id : sessionIds) sessions.deleteById(id);
        // Workers finish before this cleanup; there is no outer test transaction to roll them back.
        for (long user : users) {
            for (String table : List.of("application_status_history", "application_answers", "application_links")) {
                jdbc.update("DELETE FROM " + table + " WHERE application_id IN (SELECT id FROM applications WHERE applicant_id = ?)", user);
            }
            jdbc.update("DELETE FROM applications WHERE applicant_id = ?", user);
            jdbc.update("DELETE FROM club_memberships WHERE user_id = ?", user);
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
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id = ?", Long.class, user));
        }
        identities.names.clear();
        assertEquals(0, assertInstanceOf(com.zaxxer.hikari.HikariDataSource.class, dataSource)
                .getHikariPoolMXBean().getActiveConnections(), "No worker may leak a connection after test cleanup");
    }

    @Test
    void sameStudentConcurrentHttpSubmissionsCommitExactlyOnce() throws Exception {
        var results = overlapping(List.of(client, login(userId)));
        assertSingleSubmission(results);
    }

    @Test
    void sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce() throws Exception {
        assertSingleSubmission(overlapping(List.of(client, client, client, client, client)));
    }

    private void assertSingleSubmission(List<MvcResult> results) throws Exception {
        assertEquals(1L, results.stream().filter(r -> r.getResponse().getStatus() == 201).count());
        assertEquals(results.size() - 1L, results.stream().filter(r -> r.getResponse().getStatus() == 409).count());
        var success = results.stream().filter(r -> r.getResponse().getStatus() == 201).findFirst().orElseThrow();
        for (var conflict : results) if (conflict != success)
            assertProblem(conflict, 409, "RESOURCE_CONFLICT", "APPLICATION_ALREADY_EXISTS");
        assertComplete(success, userId);
        assertEquals(1, targetRows("applications").size());
        assertEquals(2, targetRows("application_answers").size());
        assertEquals(1, targetRows("application_links").size());
        assertEquals(1, targetRows("application_status_history").size());
        assertNoOrphans();
    }

    @Test
    void sameStudentCanSubmitToDifferentRoundsConcurrently() throws Exception {
        long otherRound = round();
        long otherFirst = question(otherRound), otherSecond = question(otherRound);
        var results = overlapping(List.of(client, login(userId)),
                List.of(new SubmissionTarget(roundId, firstQuestion, secondQuestion),
                        new SubmissionTarget(otherRound, otherFirst, otherSecond)));
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < results.size(); i++) {
            var result = results.get(i);
            long targetRound = i == 0 ? roundId : otherRound;
            assertEquals(201, result.getResponse().getStatus(), responseText(result));
            var receipt = json(result);
            assertTrue(ids.add(receipt.path("id").asText()));
            assertEquals(Long.toString(targetRound), receipt.path("roundId").asText());
            assertEquals("SUBMITTED", receipt.path("status").asText());
            long id = Long.parseLong(receipt.path("id").asText());
            assertEquals(userId, jdbc.queryForObject("SELECT applicant_id FROM applications WHERE id = ?", Long.class, id));
            assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM application_answers WHERE application_id = ?", Long.class, id));
            assertEquals(List.of(i == 0 ? firstQuestion : otherFirst, i == 0 ? secondQuestion : otherSecond),
                    jdbc.queryForList("SELECT question_id FROM application_answers WHERE application_id = ? ORDER BY question_id", Long.class, id));
            assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM application_status_history WHERE application_id = ? AND from_status IS NULL AND to_status = 'SUBMITTED' AND actor_id = ?",
                    Long.class, id, userId));
        }
        assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM applications WHERE applicant_id = ?", Long.class, userId));
        assertNoOrphans();
    }

    @Test
    void eligibleStudentsWithFourMembershipsCanSubmitTogether() throws Exception {
        long other = student();
        for (int i = 0; i < 4; i++) {
            long membershipClub = club();
            for (long user : List.of(userId, other)) jdbc.update(
                    "INSERT INTO club_memberships(user_id, club_id, joined_at) VALUES (?, ?, ?)",
                    user, membershipClub, NOW.minusSeconds(1).atOffset(ZoneOffset.UTC));
        }
        var results = overlapping(List.of(client, login(other)));
        assertComplete(results.get(0), userId);
        assertComplete(results.get(1), other);
        assertEquals(2, targetRows("applications").size());
        for (long user : List.of(userId, other)) assertEquals(4L, jdbc.queryForObject(
                "SELECT COUNT(*) FROM club_memberships WHERE user_id = ?", Long.class, user));
        assertNoOrphans();
    }

    @Test
    void severalEligibleStudentsHaveOverlappingHttpTransactions() throws Exception {
        List<Client> clients = new ArrayList<>(List.of(client));
        for (int i = 1; i < 5; i++) clients.add(login(student()));
        var results = overlapping(clients);
        Set<String> applicationIds = new HashSet<>();
        for (int i = 0; i < results.size(); i++) {
            assertComplete(results.get(i), clients.get(i).userId());
            assertTrue(applicationIds.add(json(results.get(i)).path("id").asText()));
        }
        assertEquals(5, targetRows("applications").size());
        assertEquals(10, targetRows("application_answers").size());
        assertEquals(5, targetRows("application_status_history").size());
        assertNoOrphans();
    }

    @ParameterizedTest
    @ValueSource(ints = {60, 61})
    void waitingHttpRequestRechecksClosingTimeAfterRoundLock(int seconds) throws Exception {
        try (Connection holder = dataSource.getConnection(); ExecutorService workers = Executors.newFixedThreadPool(1)) {
            holder.setAutoCommit(false);
            int holderPid = pid(holder);
            try (var statement = holder.prepareStatement("SELECT id FROM recruitment_rounds WHERE id = ? FOR UPDATE")) {
                statement.setLong(1, roundId);
                try (var result = statement.executeQuery()) { assertTrue(result.next()); }
            }
            Future<MvcResult> request = workers.submit(() -> submit("deadline", client, body("valid")));
            try {
                Set<Integer> blocked = awaitBlockedBy(holderPid, 1);
                assertFalse(request.isDone());
                assertTrue(clock.visits.isEmpty(), "Clock must not be sampled before acquiring the round lock");
                clock.now.set(NOW.plusSeconds(seconds)); // exactly closes_at and after closing; no real-time wait
                holder.commit();
                assertProblem(request.get(15, TimeUnit.SECONDS), 409, "RESOURCE_CONFLICT", "ROUND_CLOSED");
                assertEquals(blocked, Set.of(clock.visits.get("deadline").pid()));
                assertTargetEmpty();
            } finally { holder.rollback(); }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"answer", "history"})
    void injectedWriteFailureRollsBackAndSameStudentCanRetry(String stage) throws Exception {
        Map<String, List<Map<String, Object>>> unrelated = seedUnrelatedSubmission();
        installFailure(stage, null);
        var failed = submit("failure", client, body("injected-failure"));
        assertInjectedFailure(failed, stage);
        assertTargetEmpty();
        assertEquals(unrelated, unrelatedRows());
        // Trigger remains installed: only the intentionally failing payload is affected.
        var retried = submit("retry", client, body("valid"));
        assertComplete(retried, userId);
        assertEquals(1, targetRows("applications").size());
        assertEquals(unrelated, unrelatedRows());
        assertNoOrphans();
    }

    @Test
    void failedHttpLockHolderRollsBackAndWaitingRetrySucceeds() throws Exception {
        var unrelated = seedUnrelatedSubmission();
        Client waitingClient = login(userId); // commit both login transactions before acquiring any write locks
        long advisoryKey = 450000000000L + roundId;
        installFailure("history", advisoryKey);
        try (Connection coordinator = dataSource.getConnection(); ExecutorService workers = Executors.newFixedThreadPool(2)) {
            coordinator.setAutoCommit(false);
            int coordinatorPid = pid(coordinator);
            try (var lock = coordinator.prepareStatement("SELECT pg_advisory_xact_lock(?)")) {
                lock.setLong(1, advisoryKey);
                lock.execute();
            }
            Future<MvcResult> failing = workers.submit(() -> submit("holder", client, body("injected-failure")));
            try {
                Set<Integer> holderPids = awaitBlockedBy(coordinatorPid, 1);
                Visit held = clock.visits.get("holder");
                assertNotNull(held);
                assertEquals(Set.of(held.pid()), holderPids, "Request reached the history trigger after real inserts");
                Future<MvcResult> waiting = workers.submit(() -> submit("waiter", waitingClient, body("valid")));
                Set<Integer> waitingPids = awaitBlockedBy(held.pid(), 1);
                assertFalse(failing.isDone());
                assertFalse(waiting.isDone());
                coordinator.commit();
                assertInjectedFailure(failing.get(15, TimeUnit.SECONDS), "history");
                assertComplete(waiting.get(15, TimeUnit.SECONDS), userId);
                Visit waiter = clock.visits.get("waiter");
                assertEquals(waitingPids, Set.of(waiter.pid()));
                assertNotEquals(held.transactionId(), waiter.transactionId());
                assertEquals(1, targetRows("applications").size());
                assertEquals(2, targetRows("application_answers").size());
                assertEquals(1, targetRows("application_links").size());
                assertEquals(1, targetRows("application_status_history").size());
                assertEquals("valid", targetRows("applications").getFirst().get("motivation"));
                assertEquals(unrelated, unrelatedRows());
                assertNoOrphans();
                System.out.println("Task45 rollback overlap: holder=" + held + ", waiter=" + waiter);
            } finally { coordinator.rollback(); }
        }
    }

    @Test
    void realHttpLockTimeoutReturns503AndPoolAcceptsRetry() throws Exception {
        var began = new CountDownLatch(1);
        var visit = new AtomicReference<Visit>();
        var defaultTimeout = new AtomicReference<String>();
        try (Connection holder = dataSource.getConnection(); ExecutorService workers = Executors.newFixedThreadPool(1)) {
            holder.setAutoCommit(false);
            lockRow(holder, "recruitment_rounds", roundId);
            int holderPid = pid(holder);
            Future<MvcResult> request = workers.submit(() -> withBeginHook(() -> {
                defaultTimeout.set(jdbc.queryForObject("SHOW lock_timeout", String.class));
                // Safety ceiling only: production code, not the test, must set lock_timeout.
                jdbc.execute("SET LOCAL statement_timeout = '3s'");
                visit.set(currentVisit());
                began.countDown();
            }, "lock-timeout", client));
            try {
                await(began);
                assertEquals(Set.of(visit.get().pid()), awaitBlockedBy(holderPid, 1));
                assertFalse(request.isDone());
                var result = request.get(15, TimeUnit.SECONDS);
                assertLockFailure(result, "55P03");
                assertTargetEmpty();
            } finally { holder.rollback(); }
        }
        assertComplete(withBeginHook(() -> assertEquals(defaultTimeout.get(), jdbc.queryForObject("SHOW lock_timeout", String.class)),
                "retry-after-timeout", client), userId);
        assertEquals(1, targetRows("applications").size());
        assertNoOrphans();
    }

    @Test
    void realHttpDeadlockVictimReturns503AndPoolAcceptsRetry() throws Exception {
        var applicantHeld = new CountDownLatch(1);
        var proceed = new CountDownLatch(1);
        var victimVisit = new AtomicReference<Visit>();
        var defaultTimeout = new AtomicReference<String>();
        try (Connection holder = dataSource.getConnection(); ExecutorService workers = Executors.newFixedThreadPool(2)) {
            holder.setAutoCommit(false);
            try (var settings = holder.createStatement()) {
                settings.execute("SET LOCAL deadlock_timeout = '10s'");
                settings.execute("SET LOCAL statement_timeout = '12s'");
            }
            lockRow(holder, "recruitment_rounds", roundId);
            int holderPid = pid(holder);
            Future<MvcResult> victim = workers.submit(() -> withBeginHook(() -> {
                defaultTimeout.set(jdbc.queryForObject("SHOW deadlock_timeout", String.class));
                jdbc.execute("SET LOCAL deadlock_timeout = '50ms'");
                victimVisit.set(currentVisit());
                // Test-only inverse-order transaction creates a real cycle with the real service's round lock.
                jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, userId);
                applicantHeld.countDown();
                await(proceed);
            }, "deadlock-victim", client));
            try {
                await(applicantHeld);
                Future<?> blocker = workers.submit(() -> {
                    lockRow(holder, "users", userId);
                    holder.commit();
                    return null;
                });
                assertEquals(Set.of(holderPid), awaitBlockedBy(victimVisit.get().pid(), 1));
                assertFalse(victim.isDone());
                assertFalse(blocker.isDone());
                proceed.countDown();
                MvcResult result = victim.get(15, TimeUnit.SECONDS);
                blocker.get(15, TimeUnit.SECONDS);
                assertLockFailure(result, "40P01");
                assertNotEquals(holderPid, victimVisit.get().pid());
                assertTargetEmpty();
            } finally { proceed.countDown(); }
        }
        assertComplete(withBeginHook(() -> assertEquals(defaultTimeout.get(), jdbc.queryForObject("SHOW deadlock_timeout", String.class)),
                "retry-after-deadlock", client), userId);
        assertEquals(1, targetRows("applications").size());
        assertNoOrphans();
    }

    private MvcResult withBeginHook(Runnable action, String label, Client caller) throws Exception {
        TRANSACTION_BEGIN.set(action);
        try { return submit(label, caller, body("valid")); }
        finally { TRANSACTION_BEGIN.remove(); }
    }

    private Visit currentVisit() {
        assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
        return jdbc.queryForObject("SELECT pg_backend_pid(), txid_current()", (rs, row) -> new Visit(rs.getInt(1), rs.getLong(2)));
    }

    private void assertLockFailure(MvcResult result, String expectedSqlState) {
        assertProblem(result, 503, "SERVICE_UNAVAILABLE", null);
        SQLException sql = null;
        for (Throwable cause = result.getResolvedException(); cause != null; cause = cause.getCause())
            if (cause instanceof SQLException error) { sql = error; break; }
        assertNotNull(sql, "Must fail with an actual PostgreSQL lock error, not a simulated service exception");
        assertEquals(expectedSqlState, sql.getSQLState());
        assertFalse(responseText(result).contains("SELECT"));
        assertFalse(responseText(result).contains("deadlock detected"));
    }

    @Test
    void httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity() throws Exception {
        Client anonymous = csrfClient(0);
        assertProblem(submit("anonymous", anonymous, body("valid")), 401, "AUTHENTICATION_REQUIRED", null);
        var noCsrf = mvc.perform(post(path()).cookie(client.cookie()).contentType(MediaType.APPLICATION_JSON)
                .content(body("valid"))).andReturn();
        assertProblem(noCsrf, 403, "CSRF_INVALID", null);
        var forged = submit("forged", client, body("valid").replace("\"motivation\"", "\"applicantId\":\"999\",\"motivation\""));
        assertProblem(forged, 400, "VALIDATION_FAILED", null);
        assertTargetEmpty();
    }

    @Test
    void expiredAndSuspendedSessionsCannotSubmitAndAreInvalidated() throws Exception {
        expire(sessions, client.cookie());
        assertProblem(submit("expired", client, body("valid")), 401, "AUTHENTICATION_REQUIRED", null);
        assertNull(sessions.findById(sessionId(client.cookie())));
        Client suspended = login(userId);
        jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", userId);
        assertProblem(submit("suspended", suspended, body("valid")), 403, "ACCOUNT_NOT_ALLOWED", null);
        assertNull(sessions.findById(sessionId(suspended.cookie())));
        assertTargetEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"malformed", "unknown-field", "empty-body", "invalid-id"})
    void suspendedAccountPrecedesBodyAndIdValidationAndInvalidatesSession(String scenario) throws Exception {
        jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", userId);
        String payload = switch (scenario) {
            case "malformed" -> "{";
            case "unknown-field" -> body("valid").replace("\"motivation\"", "\"applicantId\":\"999\",\"motivation\"");
            case "empty-body" -> "";
            default -> body("valid");
        };
        String target = scenario.equals("invalid-id") ? "/api/v1/rounds/abc/applications" : path();
        var result = mvc.perform(post(target).cookie(client.cookie()).header("X-CSRF-TOKEN", client.token())
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andReturn();
        assertProblem(result, 403, "ACCOUNT_NOT_ALLOWED", null);
        assertNull(sessions.findById(sessionId(client.cookie())));
        assertTrue(clock.visits.isEmpty());
        assertTargetEmpty();
    }

    @Test
    void wrappedDtoValidationPreservesIndexedFieldErrors() throws Exception {
        var result = submit("wrapped-validation", client, body("valid").replace(
                "\"url\":\"https://example.org/portfolio\"", "\"url\":42"));
        assertProblem(result, 400, "VALIDATION_FAILED", null);
        assertEquals("links[0].url", json(result).path("fieldErrors").get(0).path("field").asText());
        assertInstanceOf(org.springframework.http.converter.HttpMessageNotReadableException.class, result.getResolvedException());
        assertTargetEmpty();
    }

    @Test
    void invalidHttpsUrlHttpErrorMatchesOpenApiExample() throws Exception {
        var result = submit("invalid-url", client, body("valid").replace("https://example.org/portfolio", "http://example.org/portfolio"));
        assertProblem(result, 400, "VALIDATION_FAILED", null);
        var field = json(result).path("fieldErrors").get(0);
        assertEquals("links[0].url", field.path("field").asText());
        assertEquals("INVALID_HTTPS_URL", field.path("code").asText());
        assertTargetEmpty();
    }

    @Test
    void accountStatusIsRecheckedUnderLockAfterHttpPreflight() throws Exception {
        var began = new CountDownLatch(1);
        var proceed = new CountDownLatch(1);
        try (ExecutorService workers = Executors.newFixedThreadPool(1)) {
            var request = workers.submit(() -> withBeginHook(() -> {
                began.countDown();
                await(proceed);
            }, "account-changed-after-preflight", client));
            try {
                await(began); // Pre-body Active account read has completed; write transaction has begun.
                assertEquals(1, jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", userId));
                proceed.countDown();
                assertProblem(request.get(15, TimeUnit.SECONDS), 403, "ACCOUNT_NOT_ALLOWED", null);
                assertEquals("SUSPENDED", jdbc.queryForObject("SELECT account_status FROM users WHERE id = ?", String.class, userId));
                assertNull(sessions.findById(sessionId(client.cookie())));
                assertTargetEmpty();
            } finally { proceed.countDown(); }
        }
    }

    @Test
    void malformedBodyAndIdUseContractProblemsAndUnsupportedMediaRetains415() throws Exception {
        assertProblem(submit("json", client, "{"), 400, "VALIDATION_FAILED", null);
        var invalidId = mvc.perform(post("/api/v1/rounds/abc/applications").cookie(client.cookie())
                .header("X-CSRF-TOKEN", client.token()).contentType(MediaType.APPLICATION_JSON).content(body("valid"))).andReturn();
        assertProblem(invalidId, 400, "INVALID_RESOURCE_ID", null);
        var media = mvc.perform(post(path()).cookie(client.cookie()).header("X-CSRF-TOKEN", client.token())
                .contentType(MediaType.TEXT_PLAIN).content(body("valid"))).andReturn();
        assertEquals(415, media.getResponse().getStatus());
        assertTargetEmpty();
    }

    /** Holds the first request inside the real service transaction, then observes actual DB waiters. */
    private List<MvcResult> overlapping(List<Client> clients) throws Exception {
        return overlapping(clients, java.util.Collections.nCopies(clients.size(),
                new SubmissionTarget(roundId, firstQuestion, secondQuestion)));
    }

    private List<MvcResult> overlapping(List<Client> clients, List<SubmissionTarget> targets) throws Exception {
        assertEquals(clients.size(), targets.size());
        clock.gate = new Gate("request-0");
        var ready = new CountDownLatch(clients.size() - 1);
        var start = new CountDownLatch(1);
        try (ExecutorService workers = Executors.newFixedThreadPool(clients.size())) {
            List<Future<MvcResult>> requests = new ArrayList<>();
            requests.add(workers.submit(() -> submit("request-0", clients.getFirst(), targets.getFirst())));
            try {
                await(clock.gate.entered);
                for (int i = 1; i < clients.size(); i++) {
                    final int index = i;
                    requests.add(workers.submit(() -> {
                        ready.countDown();
                        await(start);
                        return submit("request-" + index, clients.get(index), targets.get(index));
                    }));
                }
                await(ready);
                start.countDown();
                Visit first = clock.visits.get("request-0");
                Set<Integer> blocked = awaitBlockedBy(first.pid(), clients.size() - 1);
                for (var request : requests) assertFalse(request.isDone(), "Requests must overlap while DB locks are held");
                clock.release();
                List<MvcResult> results = awaitResponses(requests);
                Set<Integer> seen = new HashSet<>();
                Set<Long> transactionIds = new HashSet<>();
                for (int i = 0; i < clients.size(); i++) {
                    Visit visit = clock.visits.get("request-" + i);
                    assertNotNull(visit);
                    assertTrue(seen.add(visit.pid()), "Every overlapping request must use a different DB connection");
                    assertTrue(transactionIds.add(visit.transactionId()), "Every request must own a separate transaction");
                    if (i != 0) assertTrue(blocked.contains(visit.pid()));
                }
                System.out.println("Task45 HTTP overlap: connections=" + seen.size() + ", blocked=" + blocked.size()
                        + ", visits=" + clock.visits);
                return results;
            } finally { start.countDown(); clock.release(); }
        }
    }

    private static List<MvcResult> awaitResponses(List<Future<MvcResult>> requests) {
        List<MvcResult> results = new ArrayList<>();
        AssertionError failure = null;
        for (var request : requests) {
            try { results.add(request.get(25, TimeUnit.SECONDS)); }
            catch (Exception exception) {
                if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
                if (failure == null) failure = new AssertionError("An HTTP worker failed");
                failure.addSuppressed(exception);
            }
        }
        if (failure != null) throw failure;
        return results;
    }

    private Set<Integer> awaitBlockedBy(int root, int expected) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        while (System.nanoTime() < deadline) {
            Set<Integer> blocked = new HashSet<>(jdbc.queryForList("""
                    WITH RECURSIVE waits AS (
                        SELECT pid, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname = current_database()
                    ), chain(pid) AS (
                        SELECT CAST(? AS integer)
                        UNION SELECT w.pid FROM waits w JOIN chain c ON c.pid = ANY(w.blockers)
                    ) SELECT pid FROM chain WHERE pid <> ?
                    """, Integer.class, root, root));
            if (blocked.size() == expected) return blocked;
        }
        throw new AssertionError("Expected " + expected + " actual PostgreSQL waiters behind backend " + root);
    }

    /** Test-only trigger verifies prior writes in the same transaction before deliberately failing. */
    private void installFailure(String stage, Long advisoryKey) {
        String condition = stage.equals("answer")
                ? "NEW.round_id = " + roundId + " AND NEW.question_id = " + secondQuestion
                : "NEW.actor_id = " + userId;
        String progress = "(SELECT COUNT(*) FROM application_answers WHERE application_id = NEW.application_id) = "
                + (stage.equals("answer") ? "1" : "2");
        if (stage.equals("history")) progress += " AND (SELECT COUNT(*) FROM application_links WHERE application_id = NEW.application_id) = 1";
        String pause = advisoryKey == null ? "" : "PERFORM pg_advisory_xact_lock(" + advisoryKey + ");";
        jdbc.execute("""
                CREATE FUNCTION task45_fail_write() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF %s AND EXISTS (SELECT 1 FROM applications WHERE id = NEW.application_id
                      AND round_id = %d AND motivation = 'injected-failure' AND status = 'SUBMITTED') THEN
                    IF NOT (%s) THEN
                      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'task45_wrong_stage', MESSAGE = 'Prior write proof failed';
                    END IF;
                    %s
                    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'task45_injected_%s', MESSAGE = 'Task45 injected write failure';
                  END IF;
                  RETURN NEW;
                END $$
                """.formatted(condition, roundId, progress, pause, stage));
        jdbc.execute("CREATE TRIGGER task45_write_failure BEFORE INSERT ON "
                + (stage.equals("answer") ? "application_answers" : "application_status_history")
                + " FOR EACH ROW EXECUTE FUNCTION task45_fail_write()");
    }

    private void dropFailure() {
        jdbc.execute("DROP TRIGGER IF EXISTS task45_write_failure ON application_answers");
        jdbc.execute("DROP TRIGGER IF EXISTS task45_write_failure ON application_status_history");
        jdbc.execute("DROP FUNCTION IF EXISTS task45_fail_write()");
    }

    private void assertInjectedFailure(MvcResult result, String stage) {
        assertProblem(result, 500, "INTERNAL_ERROR", null);
        SQLException sql = null;
        for (Throwable cause = result.getResolvedException(); cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException error) sql = error;
        }
        assertNotNull(sql, "Failure must originate in the real PostgreSQL write, not validation");
        assertEquals("23514", sql.getSQLState());
        assertInstanceOf(org.postgresql.util.PSQLException.class, sql);
        assertEquals("task45_injected_" + stage,
                ((org.postgresql.util.PSQLException) sql).getServerErrorMessage().getConstraint());
        assertFalse(responseText(result).contains("task45_"), "Never expose database internals");
    }

    private void assertComplete(MvcResult result, long applicant) throws Exception {
        assertEquals(201, result.getResponse().getStatus(), responseText(result));
        JsonNode receipt = json(result);
        assertEquals(Set.of("id", "clubId", "roundId", "status", "submittedAt"), receipt.propertyNames());
        assertTrue(receipt.path("id").isString());
        assertEquals(Long.toString(clubId), receipt.path("clubId").asText());
        assertEquals(Long.toString(roundId), receipt.path("roundId").asText());
        assertEquals("SUBMITTED", receipt.path("status").asText());
        assertEquals(NOW.toString(), receipt.path("submittedAt").asText());
        assertEquals("/api/v1/me/applications/" + receipt.path("id").asText(), result.getResponse().getHeader("Location"));
        assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));
        long id = Long.parseLong(receipt.path("id").asText());
        assertEquals(applicant, jdbc.queryForObject("SELECT applicant_id FROM applications WHERE id = ?", Long.class, id));
        assertEquals(List.of(firstQuestion, secondQuestion), jdbc.queryForList(
                "SELECT question_id FROM application_answers WHERE application_id = ? ORDER BY question_id", Long.class, id));
        var history = jdbc.queryForList("SELECT * FROM application_status_history WHERE application_id = ?", id);
        assertEquals(1, history.size());
        assertNull(history.getFirst().get("from_status"));
        assertEquals("SUBMITTED", history.getFirst().get("to_status"));
        assertEquals(applicant, history.getFirst().get("actor_id"));
        assertNull(history.getFirst().get("reason"));
    }

    private void assertProblem(MvcResult result, int status, String code, String reason) {
        assertEquals(status, result.getResponse().getStatus(), responseText(result));
        assertTrue(result.getResponse().getContentType().startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE));
        assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));
        JsonNode error = json(result);
        assertEquals(status, error.path("status").asInt());
        assertEquals(code, error.path("code").asText());
        assertEquals("urn:tuclubhub:problem:" + (code.equals("VALIDATION_FAILED") ? "validation-error"
                : code.toLowerCase(java.util.Locale.ROOT).replace('_', '-')), error.path("type").asText());
        assertNotNull(UUID.fromString(error.path("traceId").asText()));
        assertEquals(result.getRequest().getRequestURI(), error.path("instance").asText());
        Set<String> allowed = new HashSet<>(Set.of("type", "title", "status", "detail", "instance", "code", "traceId", "fieldErrors"));
        if (reason != null) { allowed.add("reason"); assertEquals(reason, error.path("reason").asText()); }
        assertEquals(allowed, error.propertyNames());
    }

    private List<Map<String, Object>> targetRows(String table) {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        return new TransactionTemplate(transactions).execute(status -> jdbc.queryForList(table.equals("applications")
                ? "SELECT * FROM applications WHERE round_id = ? ORDER BY id"
                : "SELECT child.* FROM " + table + " child JOIN applications parent ON parent.id = child.application_id WHERE parent.round_id = ? ORDER BY child.id", roundId));
    }

    private void assertTargetEmpty() {
        for (String table : List.of("applications", "application_answers", "application_links", "application_status_history"))
            assertTrue(targetRows(table).isEmpty(), "No partial writes in " + table);
        assertNoOrphans();
    }

    private void assertNoOrphans() {
        for (String table : List.of("application_answers", "application_links", "application_status_history"))
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM " + table
                    + " child LEFT JOIN applications parent ON parent.id = child.application_id WHERE parent.id IS NULL", Long.class));
    }

    private Map<String, List<Map<String, Object>>> seedUnrelatedSubmission() throws Exception {
        unrelatedApplicant = student();
        Client otherClient = login(unrelatedApplicant);
        long otherRound = round();
        long question = question(otherRound);
        mvc.perform(post("/api/v1/rounds/" + otherRound + "/applications").cookie(otherClient.cookie())
                .header("X-CSRF-TOKEN", otherClient.token()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("motivation", "Unrelated existing data", "answers",
                        List.of(Map.of("questionId", Long.toString(question), "answerText", "Preserve me")),
                        "links", List.of(Map.of("label", "Existing", "url", "https://example.org/existing"))))))
                .andExpect(status().isCreated());
        var snapshot = unrelatedRows();
        for (var rows : snapshot.values()) assertEquals(1, rows.size(), "Seed one real unrelated row in every table");
        assertNotEquals(userId, unrelatedApplicant);
        return snapshot;
    }

    private Map<String, List<Map<String, Object>>> unrelatedRows() {
        Map<String, List<Map<String, Object>>> snapshot = new java.util.LinkedHashMap<>();
        for (String table : List.of("applications", "application_answers", "application_links", "application_status_history")) {
            snapshot.put(table, jdbc.queryForList(table.equals("applications")
                    ? "SELECT * FROM applications WHERE applicant_id = ? AND round_id <> ? ORDER BY id"
                    : "SELECT c.* FROM " + table + " c JOIN applications p ON p.id = c.application_id WHERE p.applicant_id = ? AND p.round_id <> ? ORDER BY c.id", unrelatedApplicant, roundId));
        }
        return snapshot;
    }

    private MvcResult submit(String label, Client caller, String body) throws Exception {
        return submit(label, caller, roundId, body);
    }

    private MvcResult submit(String label, Client caller, SubmissionTarget target) throws Exception {
        return submit(label, caller, target.roundId(), body("valid", target));
    }

    private MvcResult submit(String label, Client caller, long targetRound, String body) throws Exception {
        REQUEST.set(label);
        try {
            return mvc.perform(post("/api/v1/rounds/" + targetRound + "/applications").cookie(caller.cookie()).header("X-CSRF-TOKEN", caller.token())
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
        } finally { REQUEST.remove(); }
    }

    private String path() { return "/api/v1/rounds/" + roundId + "/applications"; }
    private String body(String motivation) {
        return body(motivation, new SubmissionTarget(roundId, firstQuestion, secondQuestion));
    }
    private String body(String motivation, SubmissionTarget target) {
        return mapper.writeValueAsString(Map.of("motivation", motivation, "answers", List.of(
                Map.of("questionId", Long.toString(target.firstQuestion()), "answerText", "First answer"),
                Map.of("questionId", Long.toString(target.secondQuestion()), "answerText", "Second answer")),
                "links", List.of(Map.of("label", "Portfolio", "url", "https://example.org/portfolio"))));
    }
    private static String responseText(MvcResult result) { return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8); }
    private JsonNode json(MvcResult result) { return mapper.readTree(responseText(result)); }

    private Client csrfClient(long user) throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        var csrf = mapper.readValue(response.getContentAsString(), CsrfTokenResponse.class);
        Cookie cookie = Arrays.stream(response.getCookies()).filter(c -> c.getName().equals("SESSION")).findFirst().orElseThrow();
        sessionIds.add(sessionId(cookie));
        return new Client(user, cookie, csrf.token());
    }

    private Client login(long user) throws Exception {
        Client anonymous = csrfClient(user);
        String username = jdbc.queryForObject("SELECT tu_username FROM users WHERE id = ?", String.class, user);
        var response = mvc.perform(post("/api/v1/auth/login").cookie(anonymous.cookie())
                .header("X-CSRF-TOKEN", anonymous.token()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("username", username, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn().getResponse();
        Cookie cookie = Arrays.stream(response.getCookies()).filter(c -> c.getName().equals("SESSION")).findFirst().orElseThrow();
        sessionIds.add(sessionId(cookie));
        var login = mapper.readValue(response.getContentAsString(), LoginResponse.class);
        assertEquals(Long.toString(user), login.user().id());
        return new Client(user, cookie, login.csrf().token());
    }

    private static String sessionId(Cookie cookie) {
        return new String(Base64.getDecoder().decode(cookie.getValue()), StandardCharsets.UTF_8);
    }

    private static <S extends Session> void expire(SessionRepository<S> repository, Cookie cookie) {
        S session = repository.findById(sessionId(cookie));
        assertNotNull(session);
        session.setAttribute(AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE,
                System.currentTimeMillis() - Duration.ofHours(9).toMillis());
        repository.save(session);
    }

    private long student() {
        String name = "task45-" + UUID.randomUUID();
        long user = jdbc.queryForObject("INSERT INTO users(tu_username, display_name) VALUES (?, 'Fictional Task45 Student') RETURNING id", Long.class, name);
        users.add(user);
        jdbc.update("INSERT INTO student_profiles(user_id, student_code, student_status) VALUES (?, ?, 'ACTIVE')",
                user, "s" + UUID.randomUUID().toString().replace("-", "").substring(0, 18));
        identities.names.add(name);
        return user;
    }
    private long club() {
        long club = jdbc.queryForObject("INSERT INTO clubs(category_id, name, description, created_by) VALUES (?, ?, 'Task45 club', ?) RETURNING id",
                Long.class, categoryId, "Task45 " + UUID.randomUUID(), userId);
        clubs.add(club);
        return club;
    }
    private long round() {
        long round = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds(club_id, title, academic_year, semester, description,
                    publication_status, published_at, opens_at, closes_at, confirmation_deadline, created_by)
                VALUES (?, 'Task45 round', 2569, 1, 'Fictional details', 'PUBLISHED', ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, clubId, NOW.minusSeconds(120).atOffset(ZoneOffset.UTC), NOW.minusSeconds(60).atOffset(ZoneOffset.UTC),
                NOW.plusSeconds(60).atOffset(ZoneOffset.UTC), NOW.plusSeconds(3600).atOffset(ZoneOffset.UTC), userId);
        rounds.add(round);
        return round;
    }
    private long question(long round) {
        return jdbc.queryForObject("""
                INSERT INTO application_questions(round_id, prompt, is_required, display_order, max_length)
                VALUES (?, 'Fictional experience question', true,
                    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM application_questions WHERE round_id = ?), 2000) RETURNING id
                """, Long.class, round, round);
    }
    private static int pid(Connection connection) throws SQLException {
        try (var statement = connection.createStatement(); var result = statement.executeQuery("SELECT pg_backend_pid()")) {
            assertTrue(result.next());
            return result.getInt(1);
        }
    }
    private static void lockRow(Connection connection, String table, long id) throws SQLException {
        try (var statement = connection.prepareStatement("SELECT id FROM " + table + " WHERE id = ? FOR UPDATE")) {
            statement.setLong(1, id);
            try (var result = statement.executeQuery()) { assertTrue(result.next()); }
        }
    }
    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(15, TimeUnit.SECONDS), "Timed out coordinating HTTP transactions"); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
    }
    private record Client(long userId, Cookie cookie, String token) {}
    private record SubmissionTarget(long roundId, long firstQuestion, long secondQuestion) {}
    private record Visit(int pid, long transactionId) {}
    private static final class Gate {
        final String label;
        final CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        Gate(String label) { this.label = label; }
    }
    static final class ControlledClock extends Clock {
        final AtomicReference<Instant> now = new AtomicReference<>(NOW);
        final Map<String, Visit> visits = new ConcurrentHashMap<>();
        final JdbcTemplate jdbc;
        volatile Gate gate;
        ControlledClock(JdbcTemplate jdbc) { this.jdbc = jdbc; }
        void release() { if (gate != null) gate.release.countDown(); }
        void reset() { release(); gate = null; visits.clear(); now.set(NOW); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() {
            String label = REQUEST.get();
            if (label != null) {
                assertTrue(TransactionSynchronizationManager.isActualTransactionActive(), "Request must invoke the transaction proxy");
                Visit visit = jdbc.queryForObject("SELECT pg_backend_pid(), txid_current()", (rs, row) -> new Visit(rs.getInt(1), rs.getLong(2)));
                assertNull(visits.putIfAbsent(label, visit), "Sample current time only once per submission");
                Gate active = gate;
                if (active != null && active.label.equals(label)) { active.entered.countDown(); await(active.release); }
            }
            return now.get();
        }
    }
    static final class FixtureIdentities {
        final Set<String> names = ConcurrentHashMap.newKeySet();
    }
    @TestConfiguration(proxyBeanMethods = false)
    static class HttpConfiguration {
        @Bean @Primary ControlledClock httpSubmissionClock(JdbcTemplate jdbc) { return new ControlledClock(jdbc); }
        @Bean FixtureIdentities fixtureIdentities() { return new FixtureIdentities(); }
        // Only the external TU provider is replaced with a fixture allowlist. Login/session/security are real.
        // Login syncs student_profiles from tu_status; "ปกติ" keeps the fixture profiles ACTIVE.
        @Bean @Primary TuAuthClient fixtureTuAuth(FixtureIdentities identities) {
            return (username, password) -> identities.names.contains(username) && PASSWORD.equals(password)
                    ? Optional.of(new TuAuthUser(username, "Fictional Task45 Student", null, "student", null, null, "ปกติ", null))
                    : Optional.empty();
        }
    }
}
