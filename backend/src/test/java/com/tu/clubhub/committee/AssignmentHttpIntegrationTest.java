package com.tu.clubhub.committee;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.auth.dto.LoginResponse;
import com.tu.clubhub.auth.integration.tu.TuAuthClient;
import com.tu.clubhub.auth.integration.tu.TuAuthUser;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.committee.service.AssignmentService;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.*;
import org.springframework.transaction.support.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real session/CSRF filters, transaction proxy, repository, audit and PostgreSQL locks. */
@SpringBootTest(properties = {
        "spring.datasource.hikari.maximum-pool-size=12",
        "spring.datasource.hikari.connection-timeout=5000",
        "spring.datasource.hikari.connection-init-sql=SET statement_timeout = '20s'",
        "clubhub.committee.assignment.lock-timeout=10s"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
@Import(AssignmentHttpIntegrationTest.Configuration.class)
class AssignmentHttpIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-11-08T09:00:00Z");
    private static final String PASSWORD = "fictional-task78-credential";
    private static final ThreadLocal<String> LABEL = new ThreadLocal<>();
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager transactions;
    @Autowired SessionRepository<?> sessions;
    @Autowired TestClock clock;
    @Autowired Identities identities;
    @Autowired AssignmentService service;
    @Autowired ClubSecurity security;
    private final List<Long> users = new ArrayList<>(), memberships = new ArrayList<>();
    private final Set<String> sessionIds = new HashSet<>();
    private long adminA, adminB, target, category, club, membership;
    private Client first, second, member;
    private final Map<String, Visit> visits = new ConcurrentHashMap<>();
    private final TransactionExecutionListener probe = new TransactionExecutionListener() {
        @Override public void afterBegin(TransactionExecution execution, Throwable failure) {
            String label = LABEL.get();
            if (failure == null && label != null && execution.getTransactionName() != null
                    && execution.getTransactionName().startsWith(AssignmentService.class.getName() + ".")) {
                assertNull(visits.putIfAbsent(label, jdbc.queryForObject("SELECT pg_backend_pid(),txid_current()",
                        (rs, row) -> new Visit(rs.getInt(1), rs.getLong(2)))));
            }
        }
    };

    @BeforeEach void setup() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive(), "Fixtures must commit before workers start");
        assertTrue(AopUtils.isAopProxy(service));
        assertEquals("PostgreSQL", jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>)
                c -> c.getMetaData().getDatabaseProductName()));
        clock.reset();
        adminA = user("ADMIN"); adminB = user("ADMIN"); target = user("USER");
        category = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id", Long.class, "Task78 " + UUID.randomUUID());
        club = jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,created_by) VALUES (?,'Task78 fictional club','Test',?) RETURNING id",
                Long.class, category, adminA);
        membership = membership(target);
        first = login(adminA); second = login(adminB); member = login(target);
        ((ConfigurableTransactionManager) transactions).addListener(probe);
    }

    @AfterEach void cleanup() {
        clock.release(); LABEL.remove(); SecurityContextHolder.clearContext();
        var manager = (ConfigurableTransactionManager) transactions;
        var listeners = new ArrayList<>(manager.getTransactionExecutionListeners()); listeners.remove(probe);
        manager.setTransactionExecutionListeners(listeners);
        dropFailure();
        for (String id : sessionIds) sessions.deleteById(id);
        for (long membership : memberships) {
            jdbc.update("DELETE FROM committee_assignment_audit WHERE assignment_id IN (SELECT id FROM club_committee_assignments WHERE membership_id=?)", membership);
            // New rows reference old rows. Delete descendants first, never truncate unrelated data.
            for (long id : jdbc.queryForList("SELECT id FROM club_committee_assignments WHERE membership_id=? ORDER BY id DESC", Long.class, membership))
                jdbc.update("DELETE FROM club_committee_assignments WHERE id=?", id);
            jdbc.update("DELETE FROM club_memberships WHERE id=?", membership);
        }
        if (club != 0) jdbc.update("DELETE FROM clubs WHERE id=?", club);
        if (category != 0) jdbc.update("DELETE FROM club_categories WHERE id=?", category);
        for (long user : users) {
            jdbc.update("DELETE FROM student_profiles WHERE user_id=?", user);
            jdbc.update("DELETE FROM users WHERE id=?", user);
        }
        identities.names.clear();
        assertEquals(0, assertInstanceOf(com.zaxxer.hikari.HikariDataSource.class, dataSource).getHikariPoolMXBean().getActiveConnections());
    }

    @Test void duplicateConcurrentAppointmentsCommitExactlyOneGrantAndAudit() throws Exception {
        var responses = overlap("", createBody("valid"), "", createBody("valid"));
        success(responses.get(0), 201, adminA, null);
        problem(responses.get(1), 409, "RESOURCE_CONFLICT", "ASSIGNMENT_TERM_OVERLAP");
        assertEquals(1, rows().size()); assertEquals(1, audits().size());
        assertEquals("ASSIGNED", audits().getFirst().get("action"));
        assertEquals(adminA, audits().getFirst().get("actor_id"));
        assertTrue(effective());
    }

    @Test void twoAdminsReplacingOneVersionCannotLoseUpdates() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        var responses = overlap("/" + original + "/replace", replaceBody(0, "winner"),
                "/" + original + "/replace", replaceBody(0, "loser"));
        long child = success(responses.get(0), 201, adminA, original);
        problem(responses.get(1), 409, "RESOURCE_CONFLICT", "VERSION_MISMATCH");
        assertReplacement(original, child, adminA, "winner");
        assertTrue(effective());
    }

    @Test void independentRecipientsInTheSameClubCanFinishWhileAnotherAssignmentIsLocked() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        long otherUser = user("USER"), otherMembership = membership(otherUser);
        long otherOriginal = assignment(otherMembership, "COMMITTEE");
        clock.gate = new Gate("qa-independent-first");
        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            var a = workers.submit(() -> command("qa-independent-first", first, "/" + original + "/replace", replaceBody(0, "First independent")));
            try {
                await(clock.gate.entered);
                var b = workers.submit(() -> command("qa-independent-second", second, "/" + otherOriginal + "/replace", replaceBody(0, "Second independent")));
                // No exclusive club lock should falsely serialize two independent recipient rows.
                var secondResult = b.get(15, TimeUnit.SECONDS);
                assertEquals(201, secondResult.getResponse().getStatus(), text(secondResult));
                assertFalse(a.isDone(), "Second request completed while the first real transaction still holds its locks");
                distinct("qa-independent-first", "qa-independent-second");
                assertEquals(Long.toString(otherUser), json(secondResult).path("userId").asText());
                assertEquals(Long.toString(adminB), json(secondResult).path("assignedBy").asText());
                long otherChild = Long.parseLong(json(secondResult).path("id").asText());
                assertEquals(otherOriginal, jdbc.queryForObject("SELECT replaces_assignment_id FROM club_committee_assignments WHERE id=?", Long.class, otherChild));
                assertEquals(1L, jdbc.queryForObject("SELECT version FROM club_committee_assignments WHERE id=?", Long.class, otherOriginal));
                assertEquals("REVOKED", jdbc.queryForObject("SELECT status FROM club_committee_assignments WHERE id=?", String.class, otherOriginal));
                clock.release();
                var results = responses(List.of(a, b));
                assertReplacement(original, success(results.get(0), 201, adminA, original), adminA, "First independent");
                assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM committee_assignment_audit a JOIN club_committee_assignments c ON c.id=a.assignment_id WHERE c.membership_id=?", Long.class, otherMembership));
                assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM club_committee_assignments WHERE membership_id=? AND status='ACTIVE' AND revoked_at IS NULL", Long.class, otherMembership));
            } finally { clock.release(); }
        }
    }

    @Test void independentPermissionRolesForOneRecipientSerializeWithoutFalseConflicts() throws Exception {
        var president = grant("President"); president.put("permissionRole", "PRESIDENT");
        var results = overlap("", createBody("Committee"), "", mapper.writeValueAsString(president));
        success(results.get(0), 201, adminA, null); success(results.get(1), 201, adminB, null);
        assertEquals(2, rows().size()); assertEquals(2, audits().size());
        assertEquals(Set.of("COMMITTEE", "PRESIDENT"), new HashSet<>(jdbc.queryForList("SELECT permission_role FROM club_committee_assignments WHERE membership_id=? AND status='ACTIVE'", String.class, membership)));
        assertTrue(effective());
    }

    @Test void grantingAndRevokingOneRoleDoesNotAffectOtherRolesOrClubs() throws Exception {
        mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isForbidden());
        long committee = success(command("qa-grant", first, "", createBody("Committee")), 201, adminA, null);
        // Existing USER session must see the new grant without logging in again.
        mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isOk());
        var president = grant("President"); president.put("permissionRole", "PRESIDENT");
        long presidentId = success(command("qa-president", second, "", mapper.writeValueAsString(president)), 201, adminB, null);
        long foreignClub = jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,created_by) VALUES (?,?,'Foreign scope',?) RETURNING id",
                Long.class, category, "Task78 foreign " + UUID.randomUUID(), adminA);
        try {
            mvc.perform(get("/api/v1/clubs/" + foreignClub + "/rounds").cookie(member.cookie())).andExpect(status().isForbidden());
            assertEquals(200, command("qa-revoke-one", first, "/" + committee + "/revoke", revokeBody(0, "Revoke COMMITTEE only")).getResponse().getStatus());
            assertEquals("ACTIVE", jdbc.queryForObject("SELECT status FROM club_committee_assignments WHERE id=?", String.class, presidentId));
            assertEquals(0L, jdbc.queryForObject("SELECT version FROM club_committee_assignments WHERE id=?", Long.class, presidentId));
            mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isOk());
            mvc.perform(get("/api/v1/clubs/" + foreignClub + "/rounds").cookie(member.cookie())).andExpect(status().isForbidden());
            assertEquals(200, command("qa-revoke-last", second, "/" + presidentId + "/revoke", revokeBody(0, "Revoke final role")).getResponse().getStatus());
            mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isForbidden());
            assertEquals(4, audits().size()); assertFalse(effective());
        } finally { jdbc.update("DELETE FROM clubs WHERE id=?", foreignClub); }
    }

    @Test void serverNanosecondClockUsesOneCanonicalMicrosecondInstantForGrantAndAudit() throws Exception {
        clock.now.set(NOW.plusNanos(123456789));
        Instant expected = NOW.plusNanos(123456000);
        var result = command("qa-canonical-clock", first, "", createBody("Canonical clock"));
        assertEquals(201, result.getResponse().getStatus(), text(result));
        var body = json(result); long id = Long.parseLong(body.path("id").asText());
        for (String field : List.of("startsAt", "createdAt", "updatedAt")) assertEquals(expected, Instant.parse(body.path(field).asText()));
        for (String field : List.of("starts_at", "created_at", "updated_at"))
            assertEquals(expected, jdbc.queryForObject("SELECT " + field + " FROM club_committee_assignments WHERE id=?", OffsetDateTime.class, id).toInstant());
        assertEquals(expected, jdbc.queryForObject("SELECT occurred_at FROM committee_assignment_audit WHERE assignment_id=?", OffsetDateTime.class, id).toInstant());
        assertEquals(1, clock.samples.get("qa-canonical-clock"));
    }

    @ParameterizedTest @ValueSource(booleans = {true, false})
    void replaceAndRevokeResolveByExpectedVersionWithoutResurrection(boolean replaceFirst) throws Exception {
        long original = assignment(membership, "COMMITTEE");
        String root = "/" + original;
        var responses = overlap(root + (replaceFirst ? "/replace" : "/revoke"),
                replaceFirst ? replaceBody(0, "winner") : revokeBody(0, "winner"),
                root + (replaceFirst ? "/revoke" : "/replace"),
                replaceFirst ? revokeBody(0, "loser") : replaceBody(0, "loser"));
        problem(responses.get(1), 409, "RESOURCE_CONFLICT", "VERSION_MISMATCH");
        if (replaceFirst) assertReplacement(original, success(responses.get(0), 201, adminA, original), adminA, "winner");
        else {
            assertEquals(200, responses.get(0).getResponse().getStatus(), text(responses.get(0)));
            assertEquals("REVOKED", json(responses.get(0)).path("status").asText());
            assertEquals(1, rows().size()); assertEquals(1, audits().size());
            assertEquals(adminA, audits().getFirst().get("actor_id"));
        }
        assertEquals(replaceFirst, effective());
    }

    @Test void staleVersionAndAlreadyRevokedAreDistinctAndDoNotWrite() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        problem(command("stale", first, "/" + original + "/revoke", revokeBody(99, "stale")), 409, "RESOURCE_CONFLICT", "VERSION_MISMATCH");
        assertTrue(audits().isEmpty());
        assertEquals(200, command("revoke", first, "/" + original + "/revoke", revokeBody(0, "revoke")).getResponse().getStatus());
        problem(command("old", second, "/" + original + "/replace", replaceBody(0, "stale")), 409, "RESOURCE_CONFLICT", "VERSION_MISMATCH");
        problem(command("already", second, "/" + original + "/revoke", revokeBody(1, "again")), 409, "RESOURCE_CONFLICT", "ASSIGNMENT_ALREADY_REVOKED");
        var read = mvc.perform(get(path() + "/" + original).cookie(second.cookie())).andExpect(status().isOk()).andReturn();
        assertEquals(1, json(read).path("version").asLong()); assertEquals(1, audits().size());
    }

    @ParameterizedTest @ValueSource(strings = {"REVOKED", "ASSIGNED"})
    void auditFailureAfterRealReplacementWritesRollsBackAndRetrySucceeds(String stage) throws Exception {
        long original = assignment(membership, "COMMITTEE");
        long unrelated = assignment(membership(user("USER")), "COMMITTEE");
        var before = jdbc.queryForMap("SELECT * FROM club_committee_assignments WHERE id=?", unrelated);
        var originalBefore = rows(); installFailure(stage, null);
        var result = command("failure", first, "/" + original + "/replace", replaceBody(0, "injected-failure"));
        injected(result, stage);
        assertEquals(originalBefore, rows()); assertTrue(audits().isEmpty());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM club_committee_assignments WHERE id=?", unrelated));
        long child = success(command("retry", second, "/" + original + "/replace", replaceBody(0, "retry")), 201, adminB, original);
        assertReplacement(original, child, adminB, "retry");
    }

    @Test void failedHolderRollsBackBeforeWaitingAdminReplacesOriginalVersion() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        long key = membership + 780000000L;
        installFailure("ASSIGNED", key);
        try (Connection coordinator = dataSource.getConnection(); ExecutorService workers = Executors.newFixedThreadPool(2)) {
            coordinator.setAutoCommit(false); int root = pid(coordinator);
            try (var statement = coordinator.createStatement()) { statement.execute("SELECT pg_advisory_xact_lock(" + key + ")"); }
            var holder = workers.submit(() -> command("failed-holder", first, "/" + original + "/replace", replaceBody(0, "injected-failure")));
            try {
                Set<Integer> blocked = blockedBy(root, 1); assertFalse(holder.isDone());
                var waiter = workers.submit(() -> command("waiting-admin", second, "/" + original + "/replace", replaceBody(0, "retry")));
                Set<Integer> chain = blockedBy(root, 2);
                assertTrue(chain.containsAll(blocked)); assertFalse(waiter.isDone());
                distinct("failed-holder", "waiting-admin");
                coordinator.rollback();
                var results = responses(List.of(holder, waiter)); injected(results.get(0), "ASSIGNED");
                long child = success(results.get(1), 201, adminB, original);
                assertReplacement(original, child, adminB, "retry"); assertTrue(effective());
            } finally { coordinator.rollback(); clock.release(); }
        }
    }

    @Test void revocationWaitsForExistingCommitteeWriterAndRemovesNextPermission() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isOk());
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        var writerPid = new AtomicReference<Integer>();
        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            var writer = workers.submit(() -> new TransactionTemplate(transactions).execute(tx -> {
                var context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        new ClubHubPrincipal(target, "fictional", "USER"), null, List.of()));
                SecurityContextHolder.setContext(context);
                try {
                    assertTrue(security.isCommittee(club));
                    writerPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    entered.countDown(); await(release); return true;
                } finally { SecurityContextHolder.clearContext(); }
            }));
            try {
                await(entered);
                var revoke = workers.submit(() -> command("revoke-waits", first, "/" + original + "/revoke", revokeBody(0, "revoke")));
                assertTrue(blockedBy(writerPid.get(), 1).contains(visits.get("revoke-waits").pid()));
                assertFalse(revoke.isDone()); release.countDown(); assertTrue(writer.get(15, TimeUnit.SECONDS));
                assertEquals(200, revoke.get(15, TimeUnit.SECONDS).getResponse().getStatus());
            } finally { release.countDown(); }
        }
        assertFalse(effective());
        mvc.perform(get("/api/v1/clubs/" + club + "/rounds").cookie(member.cookie())).andExpect(status().isForbidden());
        assertEquals(1, audits().size());
    }

    @Test void databaseLockTimeoutReturnsSafe503ThenPoolAndRetryWork() throws Exception {
        try (Connection holder = dataSource.getConnection(); ExecutorService workers = Executors.newSingleThreadExecutor()) {
            holder.setAutoCommit(false);
            try (var statement = holder.prepareStatement("SELECT user_id FROM student_profiles WHERE user_id=? FOR UPDATE")) {
                statement.setLong(1, target); statement.executeQuery().close();
            }
            var request = workers.submit(() -> command("timeout", first, "", createBody("valid")));
            try {
                blockedBy(pid(holder), 1); assertFalse(request.isDone());
                var result = request.get(18, TimeUnit.SECONDS);
                problem(result, 503, "SERVICE_UNAVAILABLE", null);
                assertEquals("55P03", sql(result).getSQLState());
                assertTrue(rows().isEmpty()); assertTrue(audits().isEmpty());
            } finally { holder.rollback(); }
        }
        success(command("retry", first, "", createBody("retry")), 201, adminA, null);
    }

    @Test void waitingAppointmentSamplesTimeAfterTheLockNotAtRequestStart() throws Exception {
        try (Connection holder = dataSource.getConnection(); ExecutorService workers = Executors.newSingleThreadExecutor()) {
            holder.setAutoCommit(false);
            try (var statement = holder.prepareStatement("SELECT user_id FROM student_profiles WHERE user_id=? FOR UPDATE")) {
                statement.setLong(1, target); statement.executeQuery().close();
            }
            var request = workers.submit(() -> command("new-time", first, "", createBody("valid")));
            try {
                blockedBy(pid(holder), 1); assertFalse(clock.samples.containsKey("new-time"));
                clock.now.set(NOW.plusSeconds(60)); holder.rollback();
                var result = request.get(15, TimeUnit.SECONDS);
                assertEquals(201, result.getResponse().getStatus(), text(result));
                assertEquals(NOW.plusSeconds(60).toString(), json(result).path("startsAt").asText());
                assertEquals(NOW.plusSeconds(60).toString(), json(result).path("createdAt").asText());
                assertEquals(1, clock.samples.get("new-time")); assertEquals(1, audits().size());
            } finally { holder.rollback(); }
        }
    }

    @Test void authenticationCsrfCurrentDatabaseRoleAndSelfManagementAreEnforced() throws Exception {
        Client anonymous = csrf(0);
        problem(command("anonymous", anonymous, "", createBody("valid")), 401, "AUTHENTICATION_REQUIRED", null);
        mvc.perform(post(path()).cookie(first.cookie()).contentType(MediaType.APPLICATION_JSON).content(createBody("valid")))
                .andExpect(status().isForbidden());
        problem(command("ordinary", member, "", createBody("valid")), 403, "ACCESS_DENIED", null);
        jdbc.update("UPDATE users SET system_role='USER' WHERE id=?", adminA);
        problem(command("stale-admin", first, "", createBody("valid")), 403, "ACCESS_DENIED", null);
        jdbc.update("UPDATE users SET system_role='ADMIN' WHERE id=?", adminA);
        // Existing session says USER, but current database role authorizes the new Admin.
        jdbc.update("UPDATE users SET system_role='ADMIN' WHERE id=?", target);
        problem(command("self", member, "", createBody("valid")), 403, "ACCESS_DENIED", null);
        long own = assignment(membership, "COMMITTEE");
        for (String action : List.of("replace", "revoke"))
            problem(command("self-" + action, member, "/" + own + "/" + action,
                    action.equals("replace") ? replaceBody(0, "self") : revokeBody(0, "self")), 403, "ACCESS_DENIED", null);
        assertTrue(audits().isEmpty());
        long otherUser = user("USER"), otherMembership = membership(otherUser);
        var body = grant("Current DB Admin, original USER session"); body.put("membershipId", Long.toString(otherMembership));
        var allowed = command("promoted-admin", member, "", mapper.writeValueAsString(body));
        assertEquals(201, allowed.getResponse().getStatus(), text(allowed));
        assertEquals(Long.toString(target), json(allowed).path("assignedBy").asText());
        assertEquals(Long.toString(otherUser), json(allowed).path("userId").asText());
        assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM committee_assignment_audit WHERE actor_id=?", Long.class, target));
    }

    @ParameterizedTest @ValueSource(strings = {"account", "student", "club", "membership", "future-membership"})
    void ineligibleRecipientCannotBeAppointedOrReplacedButCanBeRevoked(String state) throws Exception {
        long original = assignment(membership, "COMMITTEE");
        switch (state) {
            case "account" -> jdbc.update("UPDATE users SET account_status='SUSPENDED' WHERE id=?", target);
            case "student" -> jdbc.update("UPDATE student_profiles SET student_status='INACTIVE' WHERE user_id=?", target);
            case "club" -> jdbc.update("UPDATE clubs SET status='INACTIVE' WHERE id=?", club);
            case "membership" -> jdbc.update("UPDATE club_memberships SET status='LEFT',ended_at=? WHERE id=?", NOW.atOffset(ZoneOffset.UTC), membership);
            default -> jdbc.update("UPDATE club_memberships SET joined_at=? WHERE id=?", NOW.plusSeconds(60).atOffset(ZoneOffset.UTC), membership);
        }
        problem(command("create-ineligible", first, "", createBody("valid")), 409, "RESOURCE_CONFLICT", "ASSIGNMENT_RECIPIENT_INELIGIBLE");
        problem(command("replace-ineligible", first, "/" + original + "/replace", replaceBody(0, "valid")), 409, "RESOURCE_CONFLICT", "ASSIGNMENT_RECIPIENT_INELIGIBLE");
        assertTrue(audits().isEmpty());
        assertEquals(200, command("allowed-revoke", first, "/" + original + "/revoke", revokeBody(0, "revoke inactive target")).getResponse().getStatus());
        assertEquals(1, audits().size());
    }

    @Test void missingWrongScopeAndMalformedIdsHaveSafeProblems() throws Exception {
        long original = assignment(membership, "COMMITTEE");
        for (String id : List.of("0", "-1", "abc", "1.5", "01", "9223372036854775808"))
            problem(mvc.perform(get(path() + "/" + id).cookie(first.cookie())).andReturn(), 400, "INVALID_RESOURCE_ID", null);
        problem(mvc.perform(get(path() + "/9223372036854775807").cookie(first.cookie())).andReturn(), 404, "RESOURCE_NOT_FOUND", null);
        problem(mvc.perform(get(path().replace("/" + club + "/", "/9223372036854775807/") + "/" + original).cookie(first.cookie())).andReturn(),
                403, "ACCESS_DENIED", null);
    }

    @Test void adjacentTermsDistinctRolesAndOffsetTimestampsKeepExactHistory() throws Exception {
        long created = success(command("create", first, "", createBody("appointment")), 201, adminA, null);
        var adjacent = grant("adjacent"); adjacent.put("startsAt", NOW.plusSeconds(3600).toString()); adjacent.put("endsAt", NOW.plusSeconds(7200).toString());
        success(command("adjacent", second, "", mapper.writeValueAsString(adjacent)), 201, adminB, null);
        var president = grant("president"); president.put("permissionRole", "PRESIDENT");
        president.put("endsAt", "2026-11-08T17:00:00+07:00");
        long other = success(command("president", second, "", mapper.writeValueAsString(president)), 201, adminB, null);
        assertEquals(NOW.plusSeconds(3600), jdbc.queryForObject("SELECT ends_at FROM club_committee_assignments WHERE id=?", OffsetDateTime.class, other).toInstant());
        assertEquals(3, rows().size()); assertEquals(3, audits().size());
        var read = mvc.perform(get(path() + "/" + created).cookie(second.cookie())).andExpect(status().isOk()).andReturn();
        assertEquals(Set.of("id","clubId","membershipId","userId","positionName","permissionRole","startsAt","endsAt","status",
                "assignedBy","assignmentReason","replacesAssignmentId","revokedBy","revokedAt","revocationReason","createdAt","updatedAt","version"), json(read).propertyNames());
        assertTrue(json(read).path("replacesAssignmentId").isNull()); assertTrue(json(read).path("revokedBy").isNull());
    }

    @Test void strictBodiesValidationAndMediaErrorsDoNotWrite() throws Exception {
        for (String invalid : List.of("{", "[]", "null", createBody("valid").replace("\"membershipId\":\"" + membership + "\"", "\"membershipId\":" + membership),
                createBody("valid").replace("\"COMMITTEE\"", "\"ADMIN\"")))
            problem(command("invalid-" + UUID.randomUUID(), first, "", invalid), 400, "VALIDATION_FAILED", null);
        for (String field : List.of("actorId", "status", "assignedBy", "version", "userId")) {
            var body = grant("valid"); body.put(field, "forged");
            problem(command("forged-" + field, first, "", mapper.writeValueAsString(body)), 400, "VALIDATION_FAILED", null);
        }
        for (String end : List.of("2026-11-08T10:00:00", "2026-11-08T10:00:00.1234567Z", "0000-01-01T00:00:00Z", NOW.toString())) {
            var body = grant("valid"); body.put("endsAt", end);
            problem(command("end-" + end, first, "", mapper.writeValueAsString(body)), 400, "VALIDATION_FAILED", null);
        }
        for (String field : List.of("positionName", "reason")) {
            var body = grant("valid"); body.put(field, " \n\t");
            problem(command("blank-" + field, first, "", mapper.writeValueAsString(body)), 400, "VALIDATION_FAILED", null);
            body.put(field, "x".repeat(field.equals("reason") ? 2001 : 101));
            problem(command("length-" + field, first, "", mapper.writeValueAsString(body)), 400, "VALIDATION_FAILED", null);
        }
        var body = grant("valid"); body.put("startsAt", NOW.minusSeconds(1).toString());
        problem(command("backdate", first, "", mapper.writeValueAsString(body)), 400, "VALIDATION_FAILED", null);
        assertEquals(415, mvc.perform(post(path()).cookie(first.cookie()).header("X-CSRF-TOKEN", first.token())
                .contentType(MediaType.TEXT_PLAIN).content(createBody("valid"))).andReturn().getResponse().getStatus());
        assertTrue(rows().isEmpty()); assertTrue(audits().isEmpty());
    }

    private List<MvcResult> overlap(String suffixA, String bodyA, String suffixB, String bodyB) throws Exception {
        clock.gate = new Gate("first");
        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            var a = workers.submit(() -> command("first", first, suffixA, bodyA));
            try {
                await(clock.gate.entered);
                var b = workers.submit(() -> command("second", second, suffixB, bodyB));
                Set<Integer> blocked = blockedBy(visits.get("first").pid(), 1);
                assertTrue(blocked.contains(visits.get("second").pid()));
                assertFalse(a.isDone()); assertFalse(b.isDone()); distinct("first", "second");
                clock.release(); return responses(List.of(a, b));
            } finally { clock.release(); }
        }
    }
    private void distinct(String a, String b) {
        assertNotNull(visits.get(a)); assertNotNull(visits.get(b));
        assertNotEquals(visits.get(a).pid(), visits.get(b).pid()); assertNotEquals(visits.get(a).tx(), visits.get(b).tx());
        System.out.println("Task78 HTTP overlap: " + a + "=" + visits.get(a) + ", " + b + "=" + visits.get(b));
    }
    private static List<MvcResult> responses(List<Future<MvcResult>> futures) {
        List<MvcResult> results = new ArrayList<>(); AssertionError failure = null;
        for (var future : futures) try { results.add(future.get(20, TimeUnit.SECONDS)); }
        catch (Exception error) { if (failure == null) failure = new AssertionError("HTTP worker failed"); failure.addSuppressed(error); }
        if (failure != null) throw failure; return results;
    }
    private Set<Integer> blockedBy(int root, int count) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
        while (System.nanoTime() < deadline) {
            Set<Integer> blocked = new HashSet<>(jdbc.queryForList("""
                    WITH RECURSIVE waits AS (SELECT pid,pg_blocking_pids(pid) blockers FROM pg_stat_activity WHERE datname=current_database()),
                    chain(pid) AS (SELECT ?::integer UNION SELECT w.pid FROM waits w JOIN chain c ON c.pid=ANY(w.blockers))
                    SELECT pid FROM chain WHERE pid<>?
                    """, Integer.class, root, root));
            if (blocked.size() == count) return blocked;
        }
        throw new AssertionError("Expected " + count + " PostgreSQL waiters behind " + root);
    }
    private void installFailure(String stage, Long advisoryKey) {
        jdbc.execute("""
                CREATE FUNCTION task78_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
                IF NEW.reason='injected-failure' AND NEW.action='%s'
                   AND NEW.assignment_id IN (SELECT id FROM club_committee_assignments WHERE membership_id=%d) THEN
                  IF NOT (EXISTS (SELECT 1 FROM club_committee_assignments WHERE membership_id=%d AND status='REVOKED' AND version=1)
                    AND EXISTS (SELECT 1 FROM club_committee_assignments WHERE membership_id=%d AND status='ACTIVE' AND replaces_assignment_id IS NOT NULL)
                    AND (SELECT COUNT(*) FROM committee_assignment_audit a JOIN club_committee_assignments c ON c.id=a.assignment_id
                         WHERE c.membership_id=%d)=%d) THEN
                    RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='task78_wrong_stage',MESSAGE='Prior write proof failed';
                  END IF;
                  %s
                  RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='task78_injected_%s',MESSAGE='Task78 injected audit failure';
                END IF; RETURN NEW; END $$
                """.formatted(stage, membership, membership, membership, membership, stage.equals("ASSIGNED") ? 1 : 0,
                        advisoryKey == null ? "" : "PERFORM pg_advisory_xact_lock(" + advisoryKey + ");", stage));
        jdbc.execute("CREATE TRIGGER task78_audit_failure BEFORE INSERT ON committee_assignment_audit FOR EACH ROW EXECUTE FUNCTION task78_fail_audit()");
    }
    private void dropFailure() {
        jdbc.execute("DROP TRIGGER IF EXISTS task78_audit_failure ON committee_assignment_audit");
        jdbc.execute("DROP FUNCTION IF EXISTS task78_fail_audit()");
    }
    private void injected(MvcResult result, String stage) {
        problem(result, 500, "INTERNAL_ERROR", null);
        var sql = assertInstanceOf(org.postgresql.util.PSQLException.class, sql(result));
        assertEquals("23514", sql.getSQLState()); assertEquals("task78_injected_" + stage, sql.getServerErrorMessage().getConstraint());
    }
    private static SQLException sql(MvcResult result) {
        SQLException found = null;
        for (Throwable cause = result.getResolvedException(); cause != null; cause = cause.getCause()) if (cause instanceof SQLException sql) found = sql;
        return assertNotNullValue(found);
    }
    private static <T> T assertNotNullValue(T value) { assertNotNull(value); return value; }
    private long success(MvcResult result, int status, long actor, Long replaces) {
        assertEquals(status, result.getResponse().getStatus(), text(result)); var json = json(result);
        assertEquals(Long.toString(actor), json.path("assignedBy").asText());
        assertEquals(Long.toString(target), json.path("userId").asText()); assertEquals("ACTIVE", json.path("status").asText());
        assertEquals(0, json.path("version").asLong()); assertEquals(NOW.toString(), json.path("createdAt").asText());
        if (replaces == null) assertTrue(json.path("replacesAssignmentId").isNull());
        else assertEquals(replaces.toString(), json.path("replacesAssignmentId").asText());
        assertEquals(path() + "/" + json.path("id").asText(), result.getResponse().getHeader("Location"));
        assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));
        return Long.parseLong(json.path("id").asText());
    }
    private void assertReplacement(long original, long child, long actor, String reason) {
        assertEquals(2, rows().size());
        var old = jdbc.queryForMap("SELECT * FROM club_committee_assignments WHERE id=?", original);
        assertEquals("REVOKED", old.get("status")); assertEquals(1L, old.get("version"));
        assertEquals(actor, old.get("revoked_by")); assertEquals(reason, old.get("revocation_reason"));
        assertEquals(NOW.minusSeconds(30), ((java.sql.Timestamp) old.get("starts_at")).toInstant());
        assertEquals(original, jdbc.queryForObject("SELECT replaces_assignment_id FROM club_committee_assignments WHERE id=?", Long.class, child));
        assertEquals(2, audits().size());
        assertEquals(List.of("REVOKED", "ASSIGNED"), audits().stream().map(a -> a.get("action")).toList());
        assertEquals(List.of(original, child), audits().stream().map(a -> a.get("assignment_id")).toList());
        assertEquals(1L, audits().stream().map(a -> a.get("trace_id")).distinct().count());
        for (var audit : audits()) { assertEquals(actor, audit.get("actor_id")); assertEquals(reason, audit.get("reason")); }
    }
    private List<Map<String,Object>> rows() {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        return new TransactionTemplate(transactions).execute(tx -> jdbc.queryForList("SELECT * FROM club_committee_assignments WHERE membership_id=? ORDER BY id", membership));
    }
    private List<Map<String,Object>> audits() {
        return jdbc.queryForList("SELECT a.* FROM committee_assignment_audit a JOIN club_committee_assignments c ON c.id=a.assignment_id WHERE c.membership_id=? ORDER BY a.id", membership);
    }
    private boolean effective() {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new ClubHubPrincipal(target, "fictional", "USER"), null, List.of()));
        SecurityContextHolder.setContext(context);
        try { return new TransactionTemplate(transactions).execute(tx -> security.isCommittee(club)); }
        finally { SecurityContextHolder.clearContext(); }
    }
    private void problem(MvcResult result, int status, String code, String reason) {
        assertEquals(status, result.getResponse().getStatus(), text(result));
        assertTrue(result.getResponse().getContentType().startsWith("application/problem+json"));
        assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));
        var body = json(result); assertEquals(code, body.path("code").asText()); assertEquals(status, body.path("status").asInt());
        assertNotNull(UUID.fromString(body.path("traceId").asText()));
        Set<String> allowed = new HashSet<>(Set.of("type","title","status","detail","instance","code","traceId","fieldErrors"));
        if (reason != null) { allowed.add("reason"); assertEquals(reason, body.path("reason").asText()); }
        assertEquals(allowed, body.propertyNames()); assertFalse(text(result).contains("task78_")); assertFalse(text(result).contains("SELECT "));
    }
    private String path() { return "/api/v1/admin/clubs/" + club + "/committee-assignments"; }
    private Map<String,Object> grant(String reason) { return new LinkedHashMap<>(Map.of("membershipId", Long.toString(membership), "positionName", "กรรมการทดสอบ", "permissionRole", "COMMITTEE", "endsAt", NOW.plusSeconds(3600).toString(), "reason", reason)); }
    private String createBody(String reason) { return mapper.writeValueAsString(grant(reason)); }
    private String replaceBody(long version, String reason) { var body = grant(reason); body.remove("membershipId"); body.put("version", version); return mapper.writeValueAsString(body); }
    private String revokeBody(long version, String reason) { return mapper.writeValueAsString(Map.of("version", version, "reason", reason)); }
    private MvcResult command(String label, Client client, String suffix, String body) throws Exception {
        LABEL.set(label);
        try { return mvc.perform(post(path() + suffix).cookie(client.cookie()).header("X-CSRF-TOKEN", client.token()).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn(); }
        finally { LABEL.remove(); }
    }
    private static String text(MvcResult result) { return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8); }
    private JsonNode json(MvcResult result) { return mapper.readTree(text(result)); }
    private long user(String role) {
        String name = "task78-" + UUID.randomUUID();
        long id = jdbc.queryForObject("INSERT INTO users(tu_username,display_name,system_role) VALUES (?,'Fictional Task78 User',?) RETURNING id", Long.class, name, role);
        users.add(id); identities.names.add(name);
        jdbc.update("INSERT INTO student_profiles(user_id,student_code,student_status) VALUES (?,?,'ACTIVE')", id, "s" + UUID.randomUUID().toString().replace("-", "").substring(0,18));
        return id;
    }
    private long membership(long user) {
        long id = jdbc.queryForObject("INSERT INTO club_memberships(user_id,club_id,joined_at) VALUES (?,?,?) RETURNING id", Long.class, user, club, NOW.minusSeconds(3600).atOffset(ZoneOffset.UTC));
        memberships.add(id); return id;
    }
    private long assignment(long membership, String role) {
        return jdbc.queryForObject("""
                INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,assigned_by,created_at,updated_at)
                VALUES (?,'Legacy fixture',?,?,?,?,?,?) RETURNING id
                """, Long.class, membership, role, NOW.minusSeconds(30).atOffset(ZoneOffset.UTC), NOW.plusSeconds(3600).atOffset(ZoneOffset.UTC), adminA,
                NOW.minusSeconds(60).atOffset(ZoneOffset.UTC), NOW.minusSeconds(60).atOffset(ZoneOffset.UTC));
    }
    private Client csrf(long user) throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        Cookie cookie = Arrays.stream(response.getCookies()).filter(c -> c.getName().equals("SESSION")).findFirst().orElseThrow();
        sessionIds.add(sessionId(cookie)); return new Client(user, cookie, mapper.readValue(response.getContentAsString(), CsrfTokenResponse.class).token());
    }
    private Client login(long user) throws Exception {
        Client anonymous = csrf(user);
        var response = mvc.perform(post("/api/v1/auth/login").cookie(anonymous.cookie()).header("X-CSRF-TOKEN", anonymous.token())
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("username", jdbc.queryForObject("SELECT tu_username FROM users WHERE id=?", String.class, user), "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn().getResponse();
        Cookie cookie = Arrays.stream(response.getCookies()).filter(c -> c.getName().equals("SESSION")).findFirst().orElseThrow();
        sessionIds.add(sessionId(cookie)); return new Client(user, cookie, mapper.readValue(response.getContentAsString(), LoginResponse.class).csrf().token());
    }
    private static String sessionId(Cookie cookie) { return new String(Base64.getDecoder().decode(cookie.getValue()), StandardCharsets.UTF_8); }
    private static int pid(Connection c) throws SQLException { try (var s = c.createStatement(); var r = s.executeQuery("SELECT pg_backend_pid()")) { assertTrue(r.next()); return r.getInt(1); } }
    private static void await(CountDownLatch latch) { try { assertTrue(latch.await(15, TimeUnit.SECONDS), "Coordination timed out"); } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); } }
    private record Client(long user, Cookie cookie, String token) {}
    private record Visit(int pid, long tx) {}
    private static final class Gate { final String label; final CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1); Gate(String label) { this.label = label; } }
    static final class TestClock extends Clock {
        final AtomicReference<Instant> now = new AtomicReference<>(NOW);
        final Map<String,Integer> samples = new ConcurrentHashMap<>(); volatile Gate gate;
        void release() { if (gate != null) gate.release.countDown(); }
        void reset() { release(); gate = null; samples.clear(); now.set(NOW); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() {
            String label = LABEL.get(); String name = TransactionSynchronizationManager.getCurrentTransactionName();
            if (label != null && name != null && name.startsWith(AssignmentService.class.getName() + ".")) {
                assertEquals(1, samples.merge(label, 1, Integer::sum), "Sample time once after locks");
                Gate active = gate; if (active != null && active.label.equals(label)) { active.entered.countDown(); await(active.release); }
            }
            return now.get();
        }
    }
    static final class Identities { final Set<String> names = ConcurrentHashMap.newKeySet(); }
    @TestConfiguration(proxyBeanMethods = false) static class Configuration {
        @Bean @Primary TestClock assignmentTestClock() { return new TestClock(); }
        @Bean Identities assignmentIdentities() { return new Identities(); }
        @Bean @Primary TuAuthClient assignmentTuAuth(Identities identities) {
            return (name, password) -> identities.names.contains(name) && PASSWORD.equals(password)
                    ? Optional.of(new TuAuthUser(name, "Fictional Task78 User", null, "student", null, null, "ปกติ", null)) : Optional.empty();
        }
    }
}
