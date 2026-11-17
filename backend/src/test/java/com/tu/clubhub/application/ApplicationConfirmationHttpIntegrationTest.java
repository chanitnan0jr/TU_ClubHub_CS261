
package com.tu.clubhub.application;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.application.repository.ApplicationConfirmationRepository;
import com.tu.clubhub.application.repository.SelectionResultRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.doReturn;
import static org.mockito.ArgumentMatchers.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "logging.level.org.springframework.jdbc=WARN",
        "clubhub.application.submission.lock-timeout=15s"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
@Transactional
@Execution(ExecutionMode.SAME_THREAD)
class ApplicationConfirmationHttpIntegrationTest {

    private static final String PATH = "/api/v1/me/applications";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoSpyBean
    private Clock clock;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoSpyBean
    private ApplicationConfirmationRepository confirmationRepository;

    @MockitoSpyBean
    private SelectionResultRepository selectionRepository;

    private UsernamePasswordAuthenticationToken auth(long userId) {
        return UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(
                        userId, "test-user-" + userId, "USER"),
                null,
                List.of());
    }

    private long student(String prefix) {
        String suffix = UUID.randomUUID().toString();

        Long id = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test student')
                RETURNING id
                """, Long.class, prefix + "-" + suffix);

        jdbc.update("""
                INSERT INTO student_profiles
                    (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, id, "T-" + suffix.replace("-", "").substring(0, 16));

        return id;
    }

    private Fixture fixture() {
        return fixture(null);
    }

    private Fixture fixture(Long existingOwner) {
        String suffix = UUID.randomUUID().toString();
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        long owner = existingOwner == null ? student("owner") : existingOwner;
        long other = student("other");

        Long category = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, "category-" + suffix);

        Long club = jdbc.queryForObject("""
                INSERT INTO clubs
                    (category_id, name, description, created_by)
                VALUES (?, ?, 'Test description', ?)
                RETURNING id
                """, Long.class, category, "club-" + suffix, owner);

        Long round = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status,
                     published_at, results_published_at, created_by)
                VALUES (?, 'Test round', 2569, 1,
                        'Description', ?, ?, ?, 'PUBLISHED', ?, ?, ?)
                RETURNING id
                """, Long.class, club,
                now.minusDays(3),
                now.minusDays(1),
                now.plusDays(2),
                now.minusDays(4),
                now.minusHours(1),
                owner);

        Long application = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation,
                     status, submitted_at, decided_by, decided_at,
                     result_message)
                VALUES (?, ?, ?, 'Owner motivation',
                        'ACCEPTED', ?, ?, ?, 'Published result message')
                RETURNING id
                """, Long.class, round, club, owner,
                now.minusDays(2), other, now.minusHours(2));

        return new Fixture(owner, other, club, round, application);
    }

    private record Fixture(
            long ownerId,
            long otherId,
            long clubId,
            long roundId,
            long applicationId
    ) {}

    @Test
    void confirmCreatesMembershipAndHistory() throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);

        mvc.perform(post(PATH + "/" + f.applicationId() + "/confirm")
                        .with(authentication(auth(f.ownerId())))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.aMapWithSize(8)))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.applicationId")
                        .value(Long.toString(f.applicationId())))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.clubId").value(Long.toString(f.clubId())))
                .andExpect(jsonPath("$.roundId").value(Long.toString(f.roundId())))
                .andExpect(jsonPath("$.displayStatusLabel").value("ยืนยันสิทธิ์แล้ว"))
                .andExpect(jsonPath("$.membershipId").isString())
                .andExpect(jsonPath("$.idempotentReplay").value(false))
                .andExpect(jsonPath("$.respondedAt").exists());

        String applicationStatus = jdbc.queryForObject(
                "SELECT status FROM applications WHERE id = ?",
                String.class,
                f.applicationId()
        );

        org.junit.jupiter.api.Assertions.assertEquals(
                "CONFIRMED", applicationStatus);

        Integer membershipCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM club_memberships
                WHERE club_id = ? AND user_id = ?
                  AND source_application_id = ?
                """, Integer.class,
                f.clubId(), f.ownerId(), f.applicationId());

        org.junit.jupiter.api.Assertions.assertEquals(
                1, membershipCount);

        Integer historyCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM application_status_history
                WHERE application_id = ?
                  AND from_status = 'ACCEPTED'
                  AND to_status = 'CONFIRMED'
                """, Integer.class, f.applicationId());

        org.junit.jupiter.api.Assertions.assertEquals(
                1, historyCount);
        assertSuccessfulResponseState(f, "CONFIRMED");
    }

    @Test
    void declineCreatesHistoryWithoutMembership() throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);

        mvc.perform(post(PATH + "/" + f.applicationId() + "/decline")
                        .with(authentication(auth(f.ownerId())))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.aMapWithSize(8)))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.applicationId").value(Long.toString(f.applicationId())))
                .andExpect(jsonPath("$.status").value("DECLINED"))
                .andExpect(jsonPath("$.clubId").value(Long.toString(f.clubId())))
                .andExpect(jsonPath("$.roundId").value(Long.toString(f.roundId())))
                .andExpect(jsonPath("$.displayStatusLabel").value("สละสิทธิ์"))
                .andExpect(jsonPath("$.membershipId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.idempotentReplay").value(false))
                .andExpect(jsonPath("$.respondedAt").exists());

        assertSuccessfulResponseState(f, "DECLINED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void expiredDeadlineRejectsResponseWithoutChanges(String action) throws Exception {
        Fixture f = fixture();
        // Keep the deadline after closes_at and results_published_at, as required by V1.
        jdbc.update("UPDATE recruitment_rounds SET confirmation_deadline = ? WHERE id = ?",
                clock.instant().atOffset(ZoneOffset.UTC).minusMinutes(30), f.roundId());
        DatabaseState before = databaseState(f);

        conflictResponse(f, action, "CONFIRMATION_DEADLINE_EXPIRED");

        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @CsvSource({"confirm,SUBMITTED", "decline,SUBMITTED",
            "confirm,UNDER_REVIEW", "decline,UNDER_REVIEW",
            "confirm,REJECTED", "decline,REJECTED",
            "confirm,WITHDRAWN", "decline,WITHDRAWN",
            "confirm,EXPIRED", "decline,EXPIRED"})
    void nonAcceptedApplicationRejectsResponseWithoutChanges(String action, String applicationStatus)
            throws Exception {
        Fixture f = fixture();
        jdbc.update("UPDATE applications SET status = ? WHERE id = ?", applicationStatus, f.applicationId());
        DatabaseState before = databaseState(f);

        conflictResponse(f, action, applicationStatus.equals("EXPIRED")
                ? "CONFIRMATION_DEADLINE_EXPIRED" : "APPLICATION_NOT_ACCEPTED");

        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @CsvSource({"confirm,confirm", "decline,decline", "confirm,decline", "decline,confirm"})
    void repeatedResponseReplaysAndOppositeResponseConflictsWithoutChanges(String first, String second) throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        respond(f, f.ownerId(), first, 200);
        assertSuccessfulResponseState(f, first.equals("confirm") ? "CONFIRMED" : "DECLINED");
        DatabaseState before = databaseState(f);

        if (first.equals(second)) {
            var original = before.application().get("responded_at");
            mvc.perform(post(PATH + "/" + f.applicationId() + "/" + second)
                            .with(authentication(auth(f.ownerId()))).with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.idempotentReplay").value(true))
                    .andExpect(jsonPath("$.respondedAt").value(
                            ((java.sql.Timestamp) original).toInstant().toString()));
        } else {
            conflictResponse(f, second, "ALREADY_RESPONDED");
        }

        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void otherStudentCannotRespond(String action) throws Exception {
        Fixture f = fixture();
        DatabaseState before = databaseState(f);

        respond(f, f.otherId(), action, 403);

        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void anonymousUserCannotRespond(String action) throws Exception {
        Fixture f = fixture();
        DatabaseState before = databaseState(f);

        mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @CsvSource({"confirm,false", "confirm,true", "decline,false", "decline,true"})
    void missingOrInvalidCsrfRejectsResponse(String action, boolean invalidToken) throws Exception {
        Fixture f = fixture();
        DatabaseState before = databaseState(f);
        var request = post(PATH + "/" + f.applicationId() + "/" + action)
                .with(authentication(auth(f.ownerId())));
        if (invalidToken) {
            request.with(csrf().useInvalidToken());
        }

        mvc.perform(request).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        assertEquals(before, databaseState(f));
    }

    @Test
    void existingMembershipRejectsConfirmationWithoutChanges() throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        jdbc.update("""
                INSERT INTO club_memberships (club_id, user_id, joined_at)
                VALUES (?, ?, ?)
                """, f.clubId(), f.ownerId(), clock.instant().atOffset(ZoneOffset.UTC).minusDays(1));
        DatabaseState before = databaseState(f);

        conflictResponse(f, "confirm", "EXISTING_CLUB_MEMBERSHIP");

        assertEquals(before, databaseState(f));
        assertEquals(1, before.memberships().size());
        assertTrue(before.applicationHistory().isEmpty());
        assertTrue(before.membershipHistory().isEmpty());
    }

    @ParameterizedTest
    @CsvSource({"confirm,decline", "confirm,confirm", "decline,decline"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentResponsesCommitExactlyOneTransition(String first, String second) throws Exception {
        Fixture f = committedFixture();
        var executor = Executors.newFixedThreadPool(2);
        var readyToLock = new CyclicBarrier(2);
        Set<Integer> connectionIds = ConcurrentHashMap.newKeySet();
        try {
            // Rendezvous BEFORE the applicant lock: requests now serialize at users/profile.
            doAnswer(invocation -> {
                assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
                connectionIds.add(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.execute("SET LOCAL lock_timeout = '5s'");
                jdbc.execute("SET LOCAL statement_timeout = '10s'");
                readyToLock.await(10, TimeUnit.SECONDS);
                return invocation.callRealMethod();
            }).when(confirmationRepository).lockAccount(f.ownerId());

            var firstResult = executor.submit(() -> responseStatus(f, first));
            var secondResult = executor.submit(() -> responseStatus(f, second));
            int firstStatus = firstResult.get(25, TimeUnit.SECONDS);
            int secondStatus = secondResult.get(25, TimeUnit.SECONDS);

            assertEquals(2, connectionIds.size(), "Requests must use separate database connections");
            assertEquals(first.equals(second) ? List.of(200, 200) : List.of(200, 409),
                    java.util.stream.Stream.of(firstStatus, secondStatus).sorted().toList());
            String winner = firstStatus == 200 ? first : second;
            assertSuccessfulResponseState(f, winner.equals("confirm") ? "CONFIRMED" : "DECLINED");
        } finally {
            executor.shutdownNow();
            boolean stopped = executor.awaitTermination(30, TimeUnit.SECONDS);
            // Never clean up while a worker might still be writing this fixture.
            if (stopped) {
                reset(confirmationRepository);
                cleanupCommittedFixture(f);
            }
            assertTrue(stopped, "Workers did not stop; fixture retained for inspection");
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void failureAfterAllConfirmationWritesRollsBackEntireTransaction() throws Exception {
        Fixture f = committedFixture();
        DatabaseState before = databaseState(f);
        var injectedFailure = new IllegalStateException("Injected failure after membership history write");
        try {
            doAnswer(invocation -> {
                invocation.callRealMethod();
                // Prove every write really happened in the request transaction before failing.
                assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
                assertSuccessfulResponseState(f, "CONFIRMED");
                throw injectedFailure;
            }).when(confirmationRepository).insertMembershipHistory(anyLong(), eq(f.ownerId()), any());

            var result = mvc.perform(post(PATH + "/" + f.applicationId() + "/confirm")
                            .with(authentication(auth(f.ownerId())))
                            .with(csrf()))
                    .andExpect(status().isInternalServerError())
                    .andReturn();

            // @Repository exception translation wraps the spy's IllegalStateException.
            var translatedFailure = assertInstanceOf(
                    InvalidDataAccessApiUsageException.class, result.getResolvedException());
            assertSame(injectedFailure, translatedFailure.getCause());
            // No surrounding test transaction: these reads see the actual post-request database state.
            assertEquals(before, databaseState(f));
            assertEquals("ACCEPTED", before.application().get("status"));
            assertNull(before.application().get("responded_at"));
            assertTrue(before.memberships().isEmpty());
            assertTrue(before.applicationHistory().isEmpty());
            assertTrue(before.membershipHistory().isEmpty());
        } finally {
            reset(confirmationRepository);
            cleanupCommittedFixture(f);
        }
    }

    private Fixture committedFixture() {
        return new TransactionTemplate(transactionManager).execute(status -> {
            Fixture f = fixture();
            prepareVersionAndTimestamp(f);
            return f;
        });
    }

    private int responseStatus(Fixture f, String action) throws Exception {
        return responseResult(f, action).getResponse().getStatus();
    }

    private MvcResult responseResult(Fixture f, String action) throws Exception {
        return mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId())))
                        .with(csrf()))
                .andReturn();
    }

    private void cleanupCommittedFixture(Fixture... fixtures) {
        // Delete only rows created by this fixture, in foreign-key order; never reset the database.
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            for (Fixture f : fixtures) {
                Long categoryId = jdbc.queryForObject("SELECT category_id FROM clubs WHERE id = ?", Long.class, f.clubId());
                jdbc.update("DELETE FROM notifications WHERE application_id = ?", f.applicationId());
                jdbc.update("DELETE FROM selection_result_audit WHERE round_id = ?", f.roundId());
                jdbc.update("""
                        DELETE FROM club_committee_assignments WHERE membership_id IN
                        (SELECT id FROM club_memberships WHERE club_id = ?)
                        """, f.clubId());
                jdbc.update("""
                        DELETE FROM membership_history WHERE membership_id IN
                        (SELECT id FROM club_memberships WHERE club_id = ? AND user_id = ?)
                        """, f.clubId(), f.ownerId());
                jdbc.update("DELETE FROM application_status_history WHERE application_id = ?", f.applicationId());
                jdbc.update("DELETE FROM club_memberships WHERE club_id = ?", f.clubId());
                jdbc.update("DELETE FROM applications WHERE id = ?", f.applicationId());
                jdbc.update("DELETE FROM recruitment_rounds WHERE id = ?", f.roundId());
                jdbc.update("DELETE FROM clubs WHERE id = ?", f.clubId());
                jdbc.update("DELETE FROM club_categories WHERE id = ?", categoryId);
            }
            for (Fixture f : fixtures) {
                jdbc.update("DELETE FROM student_profiles WHERE user_id IN (?, ?)", f.ownerId(), f.otherId());
                jdbc.update("DELETE FROM users WHERE id IN (?, ?)", f.ownerId(), f.otherId());
            }
        });
    }

    private void respond(Fixture f, long userId, String action, int expectedStatus) throws Exception {
        var response = mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(userId)))
                        .with(csrf()))
                .andExpect(status().is(expectedStatus));
        if (expectedStatus == 403) response.andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    private void conflictResponse(Fixture f, String action, String reason) throws Exception {
        mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.reason").value(reason));
    }

    @ParameterizedTest
    @CsvSource({"confirm,0", "decline,0", "confirm,-1", "decline,abc",
            "confirm,9223372036854775808", "decline,9223372036854775808"})
    void invalidApplicationIdReturnsContractError(String action, String id) throws Exception {
        Fixture f = fixture();
        mvc.perform(post(PATH + "/" + id + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void nonexistentApplicationReturnsNotFound(String action) throws Exception {
        Fixture f = fixture();
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM applications WHERE id = ?",
                Integer.class, Long.MAX_VALUE));
        mvc.perform(post(PATH + "/" + Long.MAX_VALUE + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void legacyEndpointIsNotAnAlias(String action) throws Exception {
        Fixture f = fixture();
        DatabaseState before = databaseState(f);
        mvc.perform(post("/api/v1/applications/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isNotFound());
        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void suspendedAccountCannotReplay(String action) throws Exception {
        Fixture f = fixture();
        respond(f, f.ownerId(), action, 200);
        jdbc.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", f.ownerId());
        DatabaseState before = databaseState(f);
        mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ALLOWED"));
        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void replayIgnoresExpiredDeadlineInactiveStudentClubAndMembershipLimit(String action) throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        respond(f, f.ownerId(), action, 200);
        jdbc.update("UPDATE recruitment_rounds SET confirmation_deadline = ? WHERE id = ?",
                clock.instant().atOffset(ZoneOffset.UTC).minusMinutes(30), f.roundId());
        jdbc.update("UPDATE student_profiles SET student_status = 'INACTIVE' WHERE user_id = ?", f.ownerId());
        jdbc.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", f.clubId());
        for (int i = 0; i < 5; i++) addMembership(fixture(f.ownerId()), "ACTIVE", -1);
        DatabaseState before = databaseState(f);

        var replay = mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idempotentReplay").value(true))
                .andExpect(jsonPath("$.respondedAt").value(
                        ((java.sql.Timestamp) before.application().get("responded_at")).toInstant().toString()));
        if (action.equals("confirm")) replay.andExpect(jsonPath("$.membershipId").value(
                before.memberships().getFirst().get("id").toString()));
        else replay.andExpect(jsonPath("$.membershipId").value(org.hamcrest.Matchers.nullValue()));
        assertEquals(before, databaseState(f));
        respond(f, f.otherId(), action, 403);
        mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACTIVE", "INACTIVE", "LEFT", "REMOVED"})
    void existingMembershipInAnyStatusReturnsContractReason(String membershipStatus) throws Exception {
        Fixture f = fixture();
        addMembership(f, membershipStatus, -1);
        DatabaseState before = databaseState(f);
        conflictResponse(f, "confirm", "EXISTING_CLUB_MEMBERSHIP");
        assertEquals(before, databaseState(f));
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    void fiveEffectiveMembershipsBlockOnlyFreshConfirmation(String action) throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        for (int i = 0; i < 5; i++) addMembership(fixture(f.ownerId()), "ACTIVE", -1);
        DatabaseState before = databaseState(f);
        if (action.equals("confirm")) {
            conflictResponse(f, action, "MEMBERSHIP_LIMIT_REACHED");
            assertEquals(before, databaseState(f));
        } else {
            respond(f, f.ownerId(), action, 200);
            assertSuccessfulResponseState(f, "DECLINED");
        }
    }

    @Test
    void onlyCurrentlyEffectiveActiveMembershipsCountTowardLimit() throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        for (int i = 0; i < 4; i++) addMembership(fixture(f.ownerId()), "ACTIVE", -1);
        addMembership(fixture(f.ownerId()), "ACTIVE", 1); // Future membership does not count.
        for (String status : List.of("INACTIVE", "LEFT", "REMOVED"))
            addMembership(fixture(f.ownerId()), status, -1);
        respond(f, f.ownerId(), "confirm", 200);
        assertSuccessfulResponseState(f, "CONFIRMED");
    }

    @ParameterizedTest
    @CsvSource({"student,confirm,403", "club,confirm,403", "student,decline,200", "club,decline,200"})
    void inactiveStudentOrClubBlocksOnlyFreshConfirmation(String inactive, String action, int expected)
            throws Exception {
        Fixture f = fixture();
        prepareVersionAndTimestamp(f);
        if (inactive.equals("student"))
            jdbc.update("UPDATE student_profiles SET student_status = 'INACTIVE' WHERE user_id = ?", f.ownerId());
        else jdbc.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", f.clubId());
        DatabaseState before = databaseState(f);
        var result = mvc.perform(post(PATH + "/" + f.applicationId() + "/" + action)
                        .with(authentication(auth(f.ownerId()))).with(csrf()))
                .andExpect(status().is(expected));
        if (expected == 403) {
            result.andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
            assertEquals(before, databaseState(f));
        } else assertSuccessfulResponseState(f, "DECLINED");
    }

    @ParameterizedTest
    @CsvSource({"confirm,CANCELLED,ROUND_CANCELLED", "decline,CANCELLED,ROUND_CANCELLED",
            "confirm,UNPUBLISHED,RESULTS_NOT_PUBLISHED", "decline,UNPUBLISHED,RESULTS_NOT_PUBLISHED",
            "confirm,FUTURE,RESULTS_NOT_PUBLISHED", "decline,FUTURE,RESULTS_NOT_PUBLISHED"})
    void unavailableResultsReturnSpecificReason(String action, String condition, String reason) throws Exception {
        Fixture f = fixture();
        switch (condition) {
            case "CANCELLED" -> jdbc.update("UPDATE recruitment_rounds SET publication_status = 'CANCELLED' WHERE id = ?", f.roundId());
            case "UNPUBLISHED" -> jdbc.update("UPDATE recruitment_rounds SET results_published_at = NULL WHERE id = ?", f.roundId());
            case "FUTURE" -> jdbc.update("UPDATE recruitment_rounds SET results_published_at = ? WHERE id = ?",
                    clock.instant().atOffset(ZoneOffset.UTC).plusHours(1), f.roundId());
            default -> throw new AssertionError(condition);
        }
        DatabaseState before = databaseState(f);
        conflictResponse(f, action, reason);
        assertEquals(before, databaseState(f));
    }

    private void addMembership(Fixture f, String status, int joinedDaysFromNow) {
        OffsetDateTime joined = clock.instant().atOffset(ZoneOffset.UTC).plusDays(joinedDaysFromNow);
        jdbc.update("""
                INSERT INTO club_memberships (club_id, user_id, status, joined_at, ended_at)
                VALUES (?, ?, ?, ?, ?)
                """, f.clubId(), f.ownerId(), status, joined,
                List.of("LEFT", "REMOVED").contains(status) ? joined.plusHours(1) : null);
    }

    @ParameterizedTest
    @CsvSource({"confirm,0", "decline,0", "confirm,1", "decline,1"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void deadlineIsCheckedAfterWaitingForApplicationLock(String action, long microsAfterDeadline) throws Exception {
        Fixture f = committedFixture();
        var executor = Executors.newSingleThreadExecutor();
        var attempted = new CountDownLatch(1);
        var requestPid = new AtomicInteger();
        Instant beforeDeadline = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Instant deadline = beforeDeadline.plusSeconds(60);
        DatabaseState before = databaseState(f);
        try {
            doReturn(beforeDeadline).when(clock).instant();
            new TransactionTemplate(transactionManager).executeWithoutResult(tx -> jdbc.update(
                    "UPDATE recruitment_rounds SET confirmation_deadline = ? WHERE id = ?",
                    deadline.atOffset(ZoneOffset.UTC), f.roundId()));
            Instant storedDeadline = jdbc.queryForObject(
                    "SELECT confirmation_deadline FROM recruitment_rounds WHERE id = ?",
                    (rs, row) -> rs.getObject(1, OffsetDateTime.class).toInstant(), f.roundId());
            assertEquals(deadline, storedDeadline, "PostgreSQL must preserve the microsecond-aligned deadline");
            Instant decisionTime = storedDeadline.plus(microsAfterDeadline, ChronoUnit.MICROS);
            doAnswer(invocation -> {
                requestPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.execute("SET LOCAL lock_timeout = '15s'");
                attempted.countDown();
                return invocation.callRealMethod();
            }).when(confirmationRepository).lockApplication(f.applicationId(), f.roundId());

            // A separate real transaction blocks the HTTP request on the application row.
            var result = new TransactionTemplate(transactionManager).execute(tx -> {
                jdbc.queryForObject("SELECT id FROM applications WHERE id = ? FOR UPDATE", Long.class, f.applicationId());
                int blocker = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                var request = executor.submit(() -> responseResult(f, action));
                try {
                    assertTrue(attempted.await(10, TimeUnit.SECONDS));
                    awaitBlockedBy(requestPid.get(), blocker);
                    // Advance before returning from this callback: commit releases the
                    // application lock only after the Clock has reached/passed the stored deadline.
                    doReturn(decisionTime).when(clock).instant();
                    assertEquals(decisionTime, clock.instant());
                    return request;
                } catch (Exception error) { throw new AssertionError(error); }
            });
            var rejected = result.get(20, TimeUnit.SECONDS);
            assertEquals(409, rejected.getResponse().getStatus());
            jsonPath("$.code").value("RESOURCE_CONFLICT").match(rejected);
            jsonPath("$.reason").value("CONFIRMATION_DEADLINE_EXPIRED").match(rejected);
            assertEquals(before, databaseState(f));
        } finally {
            executor.shutdownNow();
            boolean stopped = executor.awaitTermination(25, TimeUnit.SECONDS);
            reset(clock);
            if (stopped) { reset(confirmationRepository); cleanupCommittedFixture(f); }
            assertTrue(stopped, "HTTP worker still active; fixture retained");
        }
    }

    private void awaitBlockedBy(int waiter, int blocker) throws InterruptedException {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < until) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT ? = ANY(pg_blocking_pids(?))",
                    Boolean.class, blocker, waiter))) return;
            Thread.sleep(25);
        }
        fail("Expected a real PostgreSQL lock wait");
    }

    @ParameterizedTest
    @ValueSource(strings = {"confirm", "decline"})
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void publishingResultsCanInsertNotificationWhileApplicantWaitsForRound(String action) throws Exception {
        Fixture f = new TransactionTemplate(transactionManager).execute(tx -> {
            Fixture created = fixture();
            prepareVersionAndTimestamp(created);
            jdbc.update("UPDATE recruitment_rounds SET results_published_at = NULL WHERE id = ?", created.roundId());
            OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);
            Long presidentMembership = jdbc.queryForObject("""
                    INSERT INTO club_memberships (club_id, user_id, joined_at) VALUES (?, ?, ?) RETURNING id
                    """, Long.class, created.clubId(), created.otherId(), now.minusDays(2));
            jdbc.update("""
                    INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
                    VALUES (?, 'Task69 test president', 'PRESIDENT', ?, ?, ?)
                    """, presidentMembership, now.minusDays(2), now.plusDays(2), created.otherId());
            return created;
        });
        var executor = Executors.newFixedThreadPool(2);
        var applicantLocked = new CountDownLatch(1);
        var publisherLocked = new CountDownLatch(1);
        var roundAttempted = new CountDownLatch(1);
        var applicantPid = new AtomicInteger();
        try {
            doAnswer(invocation -> {
                Object account = invocation.callRealMethod();
                jdbc.execute("SET LOCAL lock_timeout = '15s'");
                applicantLocked.countDown();
                assertTrue(publisherLocked.await(10, TimeUnit.SECONDS));
                return account;
            }).when(confirmationRepository).lockAccount(f.ownerId());
            doAnswer(invocation -> {
                applicantPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                roundAttempted.countDown();
                return invocation.callRealMethod();
            }).when(confirmationRepository).lockRound(f.roundId());
            doAnswer(invocation -> {
                int publisherPid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                publisherLocked.countDown();
                assertTrue(roundAttempted.await(10, TimeUnit.SECONDS));
                awaitBlockedBy(applicantPid.get(), publisherPid);
                // This real insert takes a users FK KEY SHARE while the applicant
                // holds NO KEY UPDATE and waits for this publisher's round lock.
                return invocation.callRealMethod();
            }).when(selectionRepository).publish(any(), anyList(), any());

            var applicant = executor.submit(() -> responseResult(f, action));
            assertTrue(applicantLocked.await(10, TimeUnit.SECONDS));
            var publisher = executor.submit(() -> mvc.perform(
                            post("/api/v1/rounds/" + f.roundId() + "/publish-results")
                                    .with(authentication(auth(f.otherId()))).with(csrf())
                                    .contentType("application/json").content("{\"version\":0}"))
                    .andReturn());
            assertEquals(200, publisher.get(25, TimeUnit.SECONDS).getResponse().getStatus());
            assertEquals(200, applicant.get(25, TimeUnit.SECONDS).getResponse().getStatus());
            assertSuccessfulResponseState(f, action.equals("confirm") ? "CONFIRMED" : "DECLINED");
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notifications WHERE application_id = ?",
                    Integer.class, f.applicationId()));
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM selection_result_audit WHERE round_id = ?",
                    Integer.class, f.roundId()));
        } finally {
            publisherLocked.countDown();
            executor.shutdownNow();
            boolean stopped = executor.awaitTermination(30, TimeUnit.SECONDS);
            if (stopped) {
                reset(confirmationRepository, selectionRepository);
                cleanupCommittedFixture(f);
            }
            assertTrue(stopped, "Workers still active; fixture retained");
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentConfirmationAcrossClubsCannotExceedFiveMemberships() throws Exception {
        List<Fixture> fixtures = new TransactionTemplate(transactionManager).execute(tx -> {
            List<Fixture> created = new ArrayList<>();
            Fixture first = fixture();
            prepareVersionAndTimestamp(first);
            created.add(first);
            for (int i = 0; i < 5; i++) {
                Fixture next = fixture(first.ownerId());
                prepareVersionAndTimestamp(next);
                created.add(next);
                if (i < 4) addMembership(next, "ACTIVE", -1);
            }
            return created;
        });
        Fixture first = fixtures.getFirst();
        Fixture second = fixtures.getLast();
        var start = new CyclicBarrier(2);
        Set<Integer> connections = ConcurrentHashMap.newKeySet();
        var executor = Executors.newFixedThreadPool(2);
        try {
            doAnswer(invocation -> {
                connections.add(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.execute("SET LOCAL lock_timeout = '15s'");
                start.await(10, TimeUnit.SECONDS);
                return invocation.callRealMethod();
            }).when(confirmationRepository).lockAccount(first.ownerId());
            doAnswer(invocation -> {
                long count = (Long) invocation.callRealMethod();
                if (count == 4) {
                    int holder = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                    int waiter = connections.stream().filter(pid -> pid != holder).findFirst().orElseThrow();
                    awaitBlockedBy(waiter, holder);
                }
                return count;
            }).when(confirmationRepository).activeMembershipCount(eq(first.ownerId()), any());
            var a = executor.submit(() -> responseStatus(first, "confirm"));
            var b = executor.submit(() -> responseStatus(second, "confirm"));
            int aStatus = a.get(25, TimeUnit.SECONDS);
            int bStatus = b.get(25, TimeUnit.SECONDS);
            assertEquals(2, connections.size());
            assertEquals(List.of(200, 409), java.util.stream.Stream.of(aStatus, bStatus).sorted().toList());
            assertEquals(5L, jdbc.queryForObject("""
                    SELECT count(*) FROM club_memberships WHERE user_id = ? AND status = 'ACTIVE'
                    AND joined_at <= ? AND ended_at IS NULL
                    """, Long.class, first.ownerId(), clock.instant().atOffset(ZoneOffset.UTC)));
            Fixture winner = aStatus == 200 ? first : second;
            Fixture loser = aStatus == 409 ? first : second;
            assertSuccessfulResponseState(winner, "CONFIRMED");
            assertEquals("ACCEPTED", databaseState(loser).application().get("status"));
            assertTrue(databaseState(loser).applicationHistory().isEmpty());
            reset(confirmationRepository);
            conflictResponse(loser, "confirm", "MEMBERSHIP_LIMIT_REACHED");
        } finally {
            executor.shutdownNow();
            boolean stopped = executor.awaitTermination(30, TimeUnit.SECONDS);
            if (stopped) { reset(confirmationRepository); cleanupCommittedFixture(fixtures.toArray(Fixture[]::new)); }
            assertTrue(stopped, "HTTP workers still active; fixtures retained");
        }
    }

    private void prepareVersionAndTimestamp(Fixture f) {
        // A nonzero starting version catches hardcoded version assignments.
        jdbc.update("UPDATE applications SET version = 7, updated_at = ? WHERE id = ?",
                clock.instant().atOffset(ZoneOffset.UTC).minusDays(1), f.applicationId());
    }

    private void assertSuccessfulResponseState(Fixture f, String expectedStatus) {
        DatabaseState state = databaseState(f);
        assertEquals(expectedStatus, state.application().get("status"));
        assertEquals(8L, ((Number) state.application().get("version")).longValue());
        Object respondedAt = state.application().get("responded_at");
        assertNotNull(respondedAt);
        assertEquals(respondedAt, state.application().get("updated_at"));
        assertEquals(1, state.applicationHistory().size());
        var history = state.applicationHistory().get(0);
        assertEquals("ACCEPTED", history.get("from_status"));
        assertEquals(expectedStatus, history.get("to_status"));
        assertEquals(expectedStatus.equals("CONFIRMED") ? "APPLICANT_CONFIRMED" : "APPLICANT_DECLINED",
                history.get("reason"));
        assertEquals(f.ownerId(), ((Number) history.get("actor_id")).longValue());
        assertEquals(respondedAt, history.get("changed_at"));

        if (expectedStatus.equals("CONFIRMED")) {
            assertEquals(1, state.memberships().size());
            var membership = state.memberships().get(0);
            assertEquals("ACTIVE", membership.get("status"));
            assertEquals(f.applicationId(), ((Number) membership.get("source_application_id")).longValue());
            assertEquals(respondedAt, membership.get("joined_at"));
            assertEquals(respondedAt, membership.get("updated_at"));
            assertEquals(0L, ((Number) membership.get("version")).longValue());
            assertEquals(1, state.membershipHistory().size());
            var membershipHistory = state.membershipHistory().get(0);
            assertEquals(membership.get("id"), membershipHistory.get("membership_id"));
            assertNull(membershipHistory.get("old_status"));
            assertEquals("ACTIVE", membershipHistory.get("new_status"));
            assertEquals("APPLICANT_CONFIRMED", membershipHistory.get("reason"));
            assertEquals(f.ownerId(), ((Number) membershipHistory.get("actor_id")).longValue());
            assertEquals(respondedAt, membershipHistory.get("changed_at"));
        } else {
            assertTrue(state.memberships().isEmpty());
            assertTrue(state.membershipHistory().isEmpty());
        }
    }

    private DatabaseState databaseState(Fixture f) {
        return new DatabaseState(
                jdbc.queryForMap("SELECT * FROM applications WHERE id = ?", f.applicationId()),
                jdbc.queryForList("SELECT * FROM application_status_history WHERE application_id = ? ORDER BY id",
                        f.applicationId()),
                jdbc.queryForList("SELECT * FROM club_memberships WHERE club_id = ? AND user_id = ? ORDER BY id",
                        f.clubId(), f.ownerId()),
                jdbc.queryForList("""
                        SELECT h.* FROM membership_history h
                        JOIN club_memberships m ON m.id = h.membership_id
                        WHERE m.club_id = ? AND m.user_id = ? ORDER BY h.id
                        """, f.clubId(), f.ownerId()));
    }

    private record DatabaseState(
            Map<String, Object> application,
            List<Map<String, Object>> applicationHistory,
            List<Map<String, Object>> memberships,
            List<Map<String, Object>> membershipHistory
    ) {}

}
