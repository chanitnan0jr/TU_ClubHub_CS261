package com.tu.clubhub.application;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import java.sql.Connection;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Committed fixtures, real filters, authorization, transactions and PostgreSQL. No service/repository mocks. */
@SpringBootTest(properties = {
        "logging.level.org.springframework.jdbc=WARN",
        "clubhub.application.submission.lock-timeout=15s"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
@Import(SelectionResultHttpIntegrationTest.Configuration.class)
class SelectionResultHttpIntegrationTest {
    static final Instant NOW = Instant.parse("2026-11-13T10:00:00Z");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired MutableClock clock;
    final List<Long> users = new ArrayList<>(), clubs = new ArrayList<>();
    final String suffix = UUID.randomUUID().toString().replace("-", "");
    final String function = "task67_" + suffix;
    long reviewer, president, outsider, applicant, secondApplicant, category, club, foreignClub, round, otherRound, app, second;

    @BeforeEach void fixtures() {
        clock.set(NOW);
        assertEquals("PostgreSQL", jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<String>) c -> c.getMetaData().getDatabaseProductName()));
        reviewer=student("Committee"); president=student("President"); outsider=student("Foreign committee");
        applicant=student("ผู้สมัคร 😀"); secondApplicant=student("Second applicant");
        category=jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id", Long.class, "Task67 " + suffix);
        club=club(); foreignClub=club(); assign(reviewer,club,"COMMITTEE"); assign(president,club,"PRESIDENT"); assign(outsider,foreignClub,"PRESIDENT");
        round=round(club); otherRound=round(foreignClub);
        app=application(round,club,applicant); second=application(round,club,secondApplicant);
    }

    @AfterEach void cleanup() {
        for (String table : List.of("applications", "recruitment_rounds", "application_status_history", "selection_result_audit", "notifications"))
            jdbc.execute("DROP TRIGGER IF EXISTS " + function + " ON " + table);
        jdbc.execute("DROP FUNCTION IF EXISTS " + function + "()");
        jdbc.execute("DROP SEQUENCE IF EXISTS " + function + "_proof");
        for (long c : clubs) {
            jdbc.update("DELETE FROM selection_result_audit WHERE club_id=?",c);
            jdbc.update("DELETE FROM notifications WHERE application_id IN (SELECT id FROM applications WHERE club_id=?)",c);
            for (String table : List.of("application_reviews", "application_status_history", "application_answers", "application_links"))
                jdbc.update("DELETE FROM " + table + " WHERE application_id IN (SELECT id FROM applications WHERE club_id=?)",c);
            jdbc.update("DELETE FROM applications WHERE club_id=?",c);
            jdbc.update("DELETE FROM application_questions WHERE round_id IN (SELECT id FROM recruitment_rounds WHERE club_id=?)",c);
            jdbc.update("DELETE FROM recruitment_rounds WHERE club_id=?",c);
            jdbc.update("DELETE FROM club_committee_assignments WHERE membership_id IN (SELECT id FROM club_memberships WHERE club_id=?)",c);
            jdbc.update("DELETE FROM club_memberships WHERE club_id=?",c);
            jdbc.update("DELETE FROM clubs WHERE id=?",c);
        }
        jdbc.update("DELETE FROM club_categories WHERE id=?",category);
        for (long u : users) { jdbc.update("DELETE FROM student_profiles WHERE user_id=?",u); jdbc.update("DELETE FROM users WHERE id=?",u); }
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM clubs WHERE name LIKE ?",Long.class,"t67-"+suffix+"%"));
        assertEquals(0,((com.zaxxer.hikari.HikariDataSource)jdbc.getDataSource()).getHikariPoolMXBean().getActiveConnections(),"All HTTP/coordinator transactions must release their connections");
        clock.set(NOW);
    }

    @Test void decisionsUsePrincipalHistoryAndDurableAuditAndSameStateEditsDoNotDuplicateHistory() throws Exception {
        var saved=as(reviewer,put(decision(app)).content(body("ACCEPTED",0,"Public message","SECRET-NOTE")));
        ok(saved); var value=body(saved);
        assertEquals("ACCEPTED",value.path("status").asText()); assertEquals("1",value.path("version").asText());
        assertEquals(Long.toString(reviewer),value.path("decidedBy").asText()); assertEquals(NOW,Instant.parse(value.path("decidedAt").asText()));
        assertEquals("SECRET-NOTE",value.path("reviews").get(0).path("internalComment").asText());
        assertEquals("ACCEPT",value.path("reviews").get(0).path("recommendation").asText());
        assertEquals("COMMITTEE_DECISION",value.path("statusHistory").get(1).path("reason").asText());
        ok(as(president,put(decision(app)).content(body("ACCEPTED",1,null,null))));
        assertEquals(2L,count("application_status_history","application_id",app));
        assertEquals(1L,count("application_reviews","application_id",app));
        assertNull(jdbc.queryForObject("SELECT result_message FROM applications WHERE id=?",String.class,app));
        ok(as(reviewer,put(decision(app)).content(body("REJECTED",2,"Feedback","New private note"))));
        assertEquals(3L,count("application_status_history","application_id",app));
        assertEquals("REJECT",jdbc.queryForObject("SELECT recommendation FROM application_reviews WHERE application_id=?",String.class,app));
        var audit=jdbc.queryForList("SELECT * FROM selection_result_audit WHERE application_id=? ORDER BY id",app);
        assertEquals(3,audit.size()); assertEquals(reviewer,((Number)audit.get(0).get("actor_id")).longValue());
        assertEquals(president,((Number)audit.get(1).get("actor_id")).longValue());
        assertEquals("DECISION_RECORDED",audit.get(0).get("action")); assertNotNull(audit.get(0).get("trace_id"));
        String states=audit.toString(); assertTrue(states.contains("SUBMITTED")); assertTrue(states.contains("REJECTED"));
        assertFalse(states.contains("SECRET-NOTE")); assertFalse(states.contains("Public message"));
        var editor=as(reviewer,get(decision(app))); ok(editor); assertEquals("3",body(editor).path("version").asText());
        assertEquals("New private note",body(editor).path("reviews").get(0).path("internalComment").asText());
        var trimmed=as(reviewer,get("/api/v1/clubs/"+club+"/applications/"+app)); ok(trimmed);
        assertFalse(body(trimmed).has("reviews")); assertFalse(body(trimmed).has("version"));
        var synced=as(reviewer,put(decision(app)).content(body("ACCEPTED",3,"Final message",null))); ok(synced);
        var syncedBody=body(synced);
        assertEquals("4",syncedBody.path("version").asText());
        assertEquals("ACCEPTED",syncedBody.path("status").asText());
        assertEquals("New private note",syncedBody.path("reviews").get(0).path("internalComment").asText());
        assertEquals("ACCEPT",syncedBody.path("reviews").get(0).path("recommendation").asText());
        assertEquals(4L,count("application_status_history","application_id",app));
        assertEquals(1L,count("application_reviews","application_id",app));
    }

    @Test void atomicBatchPreservesOrderValidatesEveryItemAndUsesOneTrace() throws Exception {
        String batch=batch(item(second,"REJECTED",0),item(app,"ACCEPTED",0));
        var saved=as(reviewer,put(batchPath()).content(batch)); ok(saved);
        assertEquals(Long.toString(second),body(saved).path("items").get(0).path("id").asText());
        assertEquals(Long.toString(app),body(saved).path("items").get(1).path("id").asText());
        assertEquals(2L,count("selection_result_audit","round_id",round));
        assertEquals(1L,jdbc.queryForObject("SELECT COUNT(DISTINCT trace_id) FROM selection_result_audit WHERE round_id=?",Long.class,round));
        var before=snapshot();
        problem(as(reviewer,put(batchPath()).content(batch(item(app,"REJECTED",1),item(second,"ACCEPTED",0)))),409,"VERSION_MISMATCH");
        assertEquals(before,snapshot());
        long foreign=application(otherRound,foreignClub,student("Foreign applicant")); before=snapshot();
        problem(as(reviewer,put(batchPath()).content(batch(item(app,"REJECTED",1),item(foreign,"ACCEPTED",0)))),403,null);
        assertEquals(before,snapshot());
        problem(as(reviewer,put(batchPath()).content(batch(item(app,"ACCEPTED",1),item(app,"REJECTED",1)))),400,null);
        problem(as(reviewer,put(batchPath()).content(batch(item(app,"ACCEPTED",1),item(9223372036854775807L,"REJECTED",0)))),404,null);
        assertEquals(before,snapshot());
    }

    @Test void draftIsHiddenInApplicantListDetailTimelineMetadataAndPublicationRevealsOnlyOwnResult() throws Exception {
        ok(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,"Welcome 😀","SECRET-NOTE"))));
        ok(as(reviewer,put(decision(second)).content(body("REJECTED",0,"Try again","PRIVATE-REJECT"))));
        for (String path : List.of("/api/v1/me/applications","/api/v1/me/applications/"+app)) {
            var result=as(applicant,get(path)); ok(result); var content=result.getResponse().getContentAsString();
            assertFalse(content.contains("ACCEPTED")); assertFalse(content.contains("REJECTED"));
            assertFalse(content.contains("Welcome")); assertFalse(content.contains("SECRET-NOTE"));
            assertFalse(content.contains("decidedBy")); assertFalse(content.contains("COMMITTEE_DECISION"));
            JsonNode visible=path.endsWith(Long.toString(app))?body(result):body(result).path("items").get(0);
            assertApplicantFields(visible);
            assertEquals("SUBMITTED",visible.path("applicantVisibleStatus").asText());
            assertTrue(visible.path("round").path("resultsPublishedAt").isNull());
            assertTrue(visible.path("round").path("confirmationDeadline").isNull());
        }
        assertEquals(0L,count("notifications","application_id",app));
        var beforeHistory=jdbc.queryForList("SELECT * FROM application_status_history WHERE application_id IN (?,?) ORDER BY id",app,second);
        var beforeApplications=jdbc.queryForList("SELECT * FROM applications WHERE id IN (?,?) ORDER BY id",app,second);
        var published=as(president,post(publishPath()).content("{\"version\":0}")); ok(published);
        var value=body(published); assertEquals(1,value.path("acceptedCount").asInt()); assertEquals(1,value.path("rejectedCount").asInt());
        assertEquals(NOW,Instant.parse(value.path("resultsPublishedAt").asText())); assertEquals(1,value.path("roundVersion").asInt());
        var detail=as(applicant,get("/api/v1/me/applications/"+app)); ok(detail);
        assertEquals("ACCEPTED_PENDING_CONFIRMATION",body(detail).path("applicantVisibleStatus").asText());
        assertEquals("Welcome 😀",body(detail).path("resultMessage").asText());
        assertApplicantFields(body(detail));
        for(var event:body(detail).path("statusHistory")) {
            assertEquals(Set.of("status","displayStatusLabel","occurredAt"),event.propertyNames());
            assertFalse(event.path("status").asText().equals("UNDER_REVIEW"));
        }
        assertFalse(detail.getResponse().getContentAsString().contains("SECRET-NOTE"));
        assertFalse(detail.getResponse().getContentAsString().contains("PRIVATE-REJECT"));
        var list=as(applicant,get("/api/v1/me/applications")); ok(list); assertEquals(1,body(list).path("items").size());
        assertEquals(Long.toString(app),body(list).path("items").get(0).path("id").asText());
        var rejected=as(secondApplicant,get("/api/v1/me/applications/"+second)); ok(rejected);
        assertEquals("REJECTED",body(rejected).path("applicantVisibleStatus").asText());
        problem(as(applicant,get("/api/v1/me/applications/"+second)),403,null);
        assertEquals(beforeHistory,jdbc.queryForList("SELECT * FROM application_status_history WHERE application_id IN (?,?) ORDER BY id",app,second));
        assertEquals(beforeApplications,jdbc.queryForList("SELECT * FROM applications WHERE id IN (?,?) ORDER BY id",app,second));
        assertEquals(2L,jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE application_id IN (?,?)",Long.class,app,second));
        assertEquals(1L,jdbc.queryForObject("SELECT COUNT(*) FROM selection_result_audit WHERE round_id=? AND action='RESULTS_PUBLISHED'",Long.class,round));
        var snapshot=snapshot();
        problem(as(president,post(publishPath()).content("{\"version\":1}")),409,"RESULTS_ALREADY_PUBLISHED");
        problem(as(reviewer,put(decision(app)).content(body("REJECTED",1,null,null))),409,"RESULTS_ALREADY_PUBLISHED");
        assertEquals(snapshot,snapshot());
    }

    @Test void authorizationCsrfAndResourceScopeAreEnforcedBeforeChildProbing() throws Exception {
        var before=snapshot();
        problem(mvc.perform(put(decision(app)).with(csrf()).contentType("application/json").content(body("ACCEPTED",0,null,null))).andReturn(),401,null);
        problem(mvc.perform(post(publishPath()).with(csrf()).contentType("application/json").content("{\"version\":0}")).andReturn(),401,null);
        problem(mvc.perform(put(decision(app)).with(authentication(auth(reviewer))).contentType("application/json").content(body("ACCEPTED",0,null,null))).andReturn(),403,null);
        problem(mvc.perform(post(publishPath()).with(authentication(auth(president))).contentType("application/json").content("{\"version\":0}")).andReturn(),403,null);
        for (long user : List.of(applicant,outsider)) {
            problem(as(user,put(decision(app)).content(body("ACCEPTED",0,null,null))),403,null);
            problem(as(user,get(decision(app))),403,null);
            problem(as(user,post(publishPath()).content("{\"version\":0}")),403,null);
        }
        jdbc.update("UPDATE users SET system_role='ADMIN' WHERE id=?",applicant);
        problem(as(applicant,put(decision(app)).content(body("ACCEPTED",0,null,null))),403,null);
        problem(as(reviewer,post(publishPath()).content("{\"version\":0}")),403,null);
        long foreign=application(otherRound,foreignClub,student("Foreign")); before=snapshot();
        problem(as(reviewer,put(decision(foreign)).content(body("ACCEPTED",0,null,null))),403,null);
        problem(as(outsider,put(decision(9223372036854775807L)).content(body("ACCEPTED",0,null,null))),403,null);
        assertEquals(before,snapshot());
        long own=application(round,club,reviewer);
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?",own);
        problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))),403,null);
        problem(as(reviewer,get(decision(app))),403,null);
    }

    @ParameterizedTest @ValueSource(strings={"expired","revoked","membership","student","club","suspended"})
    void ineffectivePermissionsRejectWrites(String state) throws Exception {
        switch(state) {
            case "expired" -> jdbc.update("UPDATE club_committee_assignments SET ends_at=? WHERE membership_id IN (SELECT id FROM club_memberships WHERE user_id=?)",at(NOW),reviewer);
            case "revoked" -> jdbc.update("UPDATE club_committee_assignments SET status='REVOKED',revoked_at=created_at,revoked_by=? WHERE membership_id IN (SELECT id FROM club_memberships WHERE user_id=?)",president,reviewer);
            case "membership" -> jdbc.update("UPDATE club_memberships SET status='INACTIVE' WHERE user_id=?",reviewer);
            case "student" -> jdbc.update("UPDATE student_profiles SET student_status='INACTIVE' WHERE user_id=?",reviewer);
            case "club" -> jdbc.update("UPDATE clubs SET status='INACTIVE' WHERE id=?",club);
            case "suspended" -> jdbc.update("UPDATE users SET account_status='SUSPENDED' WHERE id=?",reviewer);
        }
        var before=snapshot(); problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))),403,null); assertEquals(before,snapshot());
    }

    @Test void validatesStatesVersionsIdsNotesAndDoesNotCreatePartialData() throws Exception {
        var before=snapshot();
        for(String id:List.of("0","-1","abc","1.5","9223372036854775808"))
            problem(as(reviewer,put("/api/v1/rounds/"+id+"/applications/"+app+"/decision").content(body("ACCEPTED",0,null,null))),400,null);
        problem(as(reviewer,put(decision(app)).content(body("WAITLIST",0,null,null))),400,null);
        problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,"x".repeat(2001)))),400,null);
        problem(as(reviewer,put(decision(app)).content("{\"decision\":\"ACCEPTED\",\"version\":0,\"decidedBy\":\""+outsider+"\"}")),400,null);
        problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",99,null,null))),409,"VERSION_MISMATCH");
        problem(as(reviewer,put(decision(9223372036854775807L)).content(body("ACCEPTED",0,null,null))),404,null);
        assertEquals(before,snapshot());
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?",app);
        problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))),409,"INVALID_STATUS_TRANSITION");
        jdbc.update("UPDATE recruitment_rounds SET publication_status='CANCELLED' WHERE id=?",round);
        problem(as(reviewer,put(decision(second)).content(body("ACCEPTED",0,null,null))),409,"ROUND_CANCELLED");
        jdbc.update("UPDATE recruitment_rounds SET publication_status='DRAFT',published_at=NULL WHERE id=?",round);
        problem(as(reviewer,put(decision(second)).content(body("ACCEPTED",0,null,null))),409,"ROUND_NOT_PUBLISHED");
    }

    @Test void closeBoundariesManualCloseAndPublicationPreconditionsFollowContract() throws Exception {
        jdbc.update("UPDATE recruitment_rounds SET closes_at=? WHERE id=?",at(NOW.plusSeconds(10)),round);
        problem(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))),409,"ROUND_STILL_OPEN");
        problem(as(president,post(publishPath()).content("{\"version\":0}")),409,"ROUND_STILL_OPEN");
        jdbc.update("UPDATE recruitment_rounds SET closed_at=? WHERE id=?",at(NOW),round);
        ok(as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))));
        problem(as(president,post(publishPath()).content("{\"version\":0}")),409,"APPLICATIONS_INCOMPLETE");
        ok(as(reviewer,put(decision(second)).content(body("REJECTED",0,null,null))));
        problem(as(president,post(publishPath()).content("{\"version\":1}")),409,"VERSION_MISMATCH");
        jdbc.update("UPDATE club_committee_assignments SET ends_at=? WHERE membership_id IN (SELECT id FROM club_memberships WHERE user_id=?)",at(NOW.plusSeconds(10000)),president);
        clock.set(NOW.plusSeconds(7200));
        problem(as(president,post(publishPath()).content("{\"version\":0}")),409,"CONFIRMATION_DEADLINE_EXPIRED");
        assertNull(jdbc.queryForObject("SELECT results_published_at FROM recruitment_rounds WHERE id=?",Object.class,round));
    }

    @ParameterizedTest @ValueSource(strings={"application_status_history","selection_result_audit"})
    void failedDecisionHistoryOrAuditRollsBackTheWholeBatchAfterRealDatabaseWrites(String target) throws Exception {
        var before=snapshot();
        failure(target,false);
        String reviewed=item(app,"ACCEPTED",0).replace("}",",\"internalNote\":\"Rollback this private note\"}");
        problem(as(reviewer,put(batchPath()).content(batch(reviewed,item(second,"REJECTED",0)))),500,null);
        assertEquals(1L,jdbc.queryForObject("SELECT last_value FROM "+function+"_proof",Long.class));
        assertTrue(jdbc.queryForObject("SELECT is_called FROM "+function+"_proof",Boolean.class));
        assertEquals(before,snapshot());
        jdbc.execute("DROP TRIGGER "+function+" ON "+target);
        ok(as(reviewer,put(batchPath()).content(batch(item(app,"ACCEPTED",0),item(second,"REJECTED",0)))));
    }

    @ParameterizedTest @ValueSource(strings={"notifications","selection_result_audit"})
    void publicationFailureRollsBackMetadataNotificationsAndAuditButPreservesDecisions(String target) throws Exception {
        decided(); var before=snapshot(); failure(target,true);
        problem(as(president,post(publishPath()).content("{\"version\":0}")),500,null);
        assertTrue(jdbc.queryForObject("SELECT is_called FROM "+function+"_proof",Boolean.class));
        assertEquals(before,snapshot());
        jdbc.execute("DROP TRIGGER "+function+" ON "+target);
        ok(as(president,post(publishPath()).content("{\"version\":0}")));
    }

    @Test void evaluationAndPublicationOverlapOnDifferentConnectionsAndPublishTheCommittedDecision() throws Exception {
        // Other application already decided; first decision UPDATE pauses while holding round SHARE.
        ok(as(reviewer,put(decision(second)).content(body("REJECTED",0,null,null))));
        long key=670000000000L+round; gate("applications",key);
        try(var workers=Executors.newFixedThreadPool(2); Connection coordinator=jdbc.getDataSource().getConnection()) {
            coordinator.setAutoCommit(false); advisory(coordinator,key);
            int pid=pid(coordinator);
            var first=workers.submit(() -> as(reviewer,put(decision(app)).content(body("ACCEPTED",0,"Visible after publish",null))));
            int evaluation=awaitBlockedBy(pid,"UPDATE applications");
            var second=workers.submit(() -> as(president,post(publishPath()).content("{\"version\":0}")));
            int publication=awaitBlockedBy(evaluation,"SELECT * FROM recruitment_rounds");
            assertNotEquals(evaluation,publication); assertFalse(first.isDone()); assertFalse(second.isDone());
            assertEquals("SUBMITTED",jdbc.queryForObject("SELECT status FROM applications WHERE id=?",String.class,app));
            coordinator.commit(); var results=finished(first,second); ok(results.get(0)); ok(results.get(1));
        }
        assertEquals("ACCEPTED",jdbc.queryForObject("SELECT status FROM applications WHERE id=?",String.class,app));
        assertEquals(2L,jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE application_id IN (?,?)",Long.class,app,second));
        assertEquals(3L,count("selection_result_audit","round_id",round));
    }

    @Test void simultaneousPublicationCommitsExactlyOnceAndPreventsLateEvaluation() throws Exception {
        decided(); long key=670000000000L+round; gate("recruitment_rounds",key);
        try(var workers=Executors.newFixedThreadPool(3); Connection coordinator=jdbc.getDataSource().getConnection()) {
            coordinator.setAutoCommit(false); advisory(coordinator,key);
            var first=workers.submit(() -> as(president,post(publishPath()).content("{\"version\":0}")));
            int holder=awaitBlockedBy(pid(coordinator),"UPDATE recruitment_rounds");
            var repeated=workers.submit(() -> as(president,post(publishPath()).content("{\"version\":0}")));
            int waiting=awaitBlockedBy(holder,"SELECT * FROM recruitment_rounds");
            var late=workers.submit(() -> as(reviewer,put(decision(app)).content(body("REJECTED",1,null,null))));
            awaitRoundWaiters(2);
            assertNotEquals(holder,waiting); assertFalse(first.isDone()); assertFalse(repeated.isDone()); assertFalse(late.isDone());
            coordinator.commit(); var results=finished(first,repeated,late); ok(results.get(0));
            problem(results.get(1),409,"RESULTS_ALREADY_PUBLISHED");
            problem(results.get(2),409,"RESULTS_ALREADY_PUBLISHED");
        }
        assertEquals(1L,jdbc.queryForObject("SELECT COUNT(*) FROM selection_result_audit WHERE round_id=? AND action='RESULTS_PUBLISHED'",Long.class,round));
        assertEquals(2L,jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE application_id IN (?,?)",Long.class,app,second));
        assertEquals("ACCEPTED",jdbc.queryForObject("SELECT status FROM applications WHERE id=?",String.class,app));
    }

    @Test void termExpiryWhileWaitingForRoundLockIsRecheckedBeforeWriting() throws Exception {
        try(var worker=Executors.newSingleThreadExecutor(); Connection coordinator=jdbc.getDataSource().getConnection()) {
            coordinator.setAutoCommit(false);
            try(var statement=coordinator.prepareStatement("SELECT id FROM recruitment_rounds WHERE id=? FOR UPDATE")) {
                statement.setLong(1,round); statement.executeQuery().close();
            }
            var request=worker.submit(() -> as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))));
            awaitBlockedBy(pid(coordinator),"SELECT * FROM recruitment_rounds");
            clock.set(NOW.plusSeconds(3600)); coordinator.commit();
            problem(request.get(15,TimeUnit.SECONDS),403,null);
        }
        assertEquals("SUBMITTED",jdbc.queryForObject("SELECT status FROM applications WHERE id=?",String.class,app));
        assertEquals(0L,count("selection_result_audit","round_id",round));
    }

    @Test void publicationDeadlineIsSampledAfterWaitingAndExpiredRoundStaysPrivate() throws Exception {
        decided();
        jdbc.update("UPDATE club_committee_assignments SET ends_at=? WHERE membership_id IN (SELECT id FROM club_memberships WHERE user_id=?)",at(NOW.plusSeconds(10000)),president);
        try(var worker=Executors.newSingleThreadExecutor(); Connection coordinator=jdbc.getDataSource().getConnection()) {
            coordinator.setAutoCommit(false);
            try(var statement=coordinator.prepareStatement("SELECT id FROM recruitment_rounds WHERE id=? FOR UPDATE")) {
                statement.setLong(1,round); statement.executeQuery().close();
            }
            var request=worker.submit(() -> as(president,post(publishPath()).content("{\"version\":0}")));
            awaitBlockedBy(pid(coordinator),"SELECT * FROM recruitment_rounds");
            clock.set(NOW.plusSeconds(7200)); coordinator.commit();
            problem(request.get(15,TimeUnit.SECONDS),409,"CONFIRMATION_DEADLINE_EXPIRED");
        }
        assertNull(jdbc.queryForObject("SELECT results_published_at FROM recruitment_rounds WHERE id=?",Object.class,round));
        assertEquals(0L,count("notifications","application_id",app));
        var read=as(applicant,get("/api/v1/me/applications/"+app)); ok(read);
        assertEquals("SUBMITTED",body(read).path("applicantVisibleStatus").asText());
    }

    @Test void simultaneousDecisionsWithSameVersionCommitOneAuditAndOneTransition() throws Exception {
        long key=670000000000L+round; gate("applications",key);
        try(var workers=Executors.newFixedThreadPool(2); Connection coordinator=jdbc.getDataSource().getConnection()) {
            coordinator.setAutoCommit(false); advisory(coordinator,key);
            var accepted=workers.submit(() -> as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null))));
            int holder=awaitBlockedBy(pid(coordinator),"UPDATE applications");
            var rejected=workers.submit(() -> as(president,put(decision(app)).content(body("REJECTED",0,null,null))));
            int waiter=awaitBlockedBy(holder,"SELECT * FROM applications");
            assertNotEquals(holder,waiter); assertFalse(accepted.isDone()); assertFalse(rejected.isDone());
            coordinator.commit(); var results=finished(accepted,rejected); ok(results.get(0)); problem(results.get(1),409,"VERSION_MISMATCH");
        }
        assertEquals("ACCEPTED",jdbc.queryForObject("SELECT status FROM applications WHERE id=?",String.class,app));
        assertEquals(1L,count("selection_result_audit","application_id",app));
        assertEquals(2L,count("application_status_history","application_id",app));
    }

    @Test void underReviewAndWithdrawnRulesEmptyRoundsAndPublicationSelfReviewAreExplicit() throws Exception {
        jdbc.update("UPDATE applications SET status='UNDER_REVIEW' WHERE id=?",app);
        ok(as(reviewer,put(decision(app)).content(body("REJECTED",0,null,null))));
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?",second);
        var published=as(president,post(publishPath()).content("{\"version\":0}")); ok(published);
        assertEquals(0,body(published).path("acceptedCount").asInt()); assertEquals(1,body(published).path("rejectedCount").asInt());
        assertEquals(0L,count("notifications","application_id",second));
        long empty=round(club);
        var emptyResult=as(president,post("/api/v1/rounds/"+empty+"/publish-results").content("{\"version\":0}")); ok(emptyResult);
        assertEquals(0,body(emptyResult).path("acceptedCount").asInt()); assertEquals(0,body(emptyResult).path("rejectedCount").asInt());
        long self=round(club); long withdrawn=application(self,club,president);
        jdbc.update("UPDATE applications SET status='WITHDRAWN' WHERE id=?",withdrawn);
        problem(as(president,post("/api/v1/rounds/"+self+"/publish-results").content("{\"version\":0}")),403,null);
        problem(as(president,post("/api/v1/rounds/9223372036854775807/publish-results").content("{\"version\":0}")),404,null);
        problem(as(reviewer,put(decision(app)).content("null")),400,null);
    }

    @Test void realStoredSessionCanEvaluateAndPublishButAnonymousEditorIsProtected() throws Exception {
        var session=storeSession(president);
        try {
            var cookie=new jakarta.servlet.http.Cookie("SESSION",java.util.Base64.getEncoder().encodeToString(session.getId().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            var editor=mvc.perform(get(decision(app)).cookie(cookie)).andReturn(); ok(editor);
            var saved=mvc.perform(put(batchPath()).cookie(cookie).with(csrf()).contentType("application/json")
                    .content(batch(item(app,"ACCEPTED",0),item(second,"REJECTED",0)))).andReturn(); ok(saved);
            ok(mvc.perform(post(publishPath()).cookie(cookie).with(csrf()).contentType("application/json").content("{\"version\":0}")).andReturn());
            problem(mvc.perform(get(decision(app))).andReturn(),401,null);
        } finally { sessions.deleteById(session.getId()); }
    }

    @ParameterizedTest @ValueSource(strings={"55P03","40P01"})
    void onlyKnownPostgresLockFailuresBecome503AndRollbackAllDecisionWrites(String state) throws Exception {
        var before=snapshot();
        jdbc.execute("CREATE FUNCTION "+function+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.application_id="+app
                +" THEN RAISE EXCEPTION 'Task67 simulated lock failure' USING ERRCODE='"+state+"'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER "+function+" BEFORE INSERT ON selection_result_audit FOR EACH ROW EXECUTE FUNCTION "+function+"()");
        var response=as(reviewer,put(decision(app)).content(body("ACCEPTED",0,null,null)));
        problem(response,503,null); assertEquals("SERVICE_UNAVAILABLE",body(response).path("code").asText());
        assertEquals(before,snapshot());
    }

    private void assertApplicantFields(JsonNode value) {
        var allowed=new HashSet<>(Set.of("id","club","round","submittedAt","applicantVisibleStatus","displayStatusLabel","canConfirm","canDecline","respondedAt"));
        if(value.has("motivation")) allowed.addAll(Set.of("motivation","questionsWithAnswers","links","resultMessage","statusHistory"));
        assertEquals(allowed,value.propertyNames());
        assertEquals(Set.of("id","name","imageUrl"),value.path("club").propertyNames());
        assertEquals(Set.of("id","title","academicYear","semester","opensAt","closesAt","resultsPublishedAt","confirmationDeadline"),value.path("round").propertyNames());
    }

    @Autowired org.springframework.session.SessionRepository<?> sessions;
    private org.springframework.session.Session storeSession(long user) { return storeSession(sessions,user); }
    private <S extends org.springframework.session.Session> S storeSession(org.springframework.session.SessionRepository<S> repository,long user) {
        S session=repository.createSession();
        var context=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext(); context.setAuthentication(auth(user));
        session.setAttribute("SPRING_SECURITY_CONTEXT",context); repository.save(session); return session;
    }

    // Failure checks inspect the real writes in the failing transaction. A test-only sequence
    // records that this point was reached despite rollback (never assert business ID continuity).
    private void failure(String table, boolean publishing) {
        jdbc.execute("CREATE SEQUENCE "+function+"_proof");
        String condition=publishing ? "(SELECT results_published_at IS NOT NULL FROM recruitment_rounds WHERE id="+round+")"
                : "(SELECT status='ACCEPTED' AND version=1 FROM applications WHERE id="+app+")";
        String extra=publishing
                ? " AND EXISTS(SELECT 1 FROM notifications WHERE application_id="+app+")"
                : " AND (SELECT status='REJECTED' AND version=1 FROM applications WHERE id="+second+")"
                  +" AND EXISTS(SELECT 1 FROM application_status_history WHERE application_id="+app+" AND reason='COMMITTEE_DECISION')"
                  +" AND EXISTS(SELECT 1 FROM application_reviews WHERE application_id="+app+")";
        String scoped=publishing ? (table.equals("notifications") ? "NEW.application_id="+second : "NEW.round_id="+round+" AND NEW.action='RESULTS_PUBLISHED'")
                : "NEW.application_id="+second;
        jdbc.execute("CREATE FUNCTION "+function+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF "+scoped+" AND "+condition+extra
                +" THEN PERFORM nextval('"+function+"_proof'); RAISE EXCEPTION 'Task67 injected failure after database mutation' USING ERRCODE='P6701'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER "+function+" BEFORE INSERT ON "+table+" FOR EACH ROW EXECUTE FUNCTION "+function+"()");
    }
    private void gate(String table,long key) {
        String condition=table.equals("applications")?"NEW.id="+app:"NEW.id="+round+" AND NEW.results_published_at IS NOT NULL";
        jdbc.execute("CREATE FUNCTION "+function+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF "+condition+" THEN PERFORM pg_advisory_xact_lock("+key+"); END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER "+function+" AFTER UPDATE ON "+table+" FOR EACH ROW EXECUTE FUNCTION "+function+"()");
    }
    private int awaitBlockedBy(int blocker,String query) {
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        do {
            var ids=jdbc.queryForList("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND ?=ANY(pg_blocking_pids(pid)) AND query LIKE ?",Integer.class,blocker,"%"+query+"%");
            if(!ids.isEmpty()){
                assertNotEquals(blocker,ids.getFirst());
                System.out.println("Task67 PostgreSQL overlap: blockedPid="+ids.getFirst()+", blockerPid="+blocker);
                return ids.getFirst();
            }
            Thread.yield();
        }while(System.nanoTime()<deadline);
        fail("Expected overlapping PostgreSQL lock wait: "+query); return -1;
    }
    private void awaitRoundWaiters(int count) {
        long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        do {
            // PostgreSQL may queue a third waiter behind the second waiter, rather than
            // directly behind the lock holder. Both must be in a real round-lock wait.
            if(jdbc.queryForObject("SELECT COUNT(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%SELECT * FROM recruitment_rounds%'",Integer.class)>=count)return;
            Thread.yield();
        }while(System.nanoTime()<deadline); fail("Expected all requests to overlap on round lock");
    }
    private static void advisory(Connection c,long key)throws Exception {try(var s=c.prepareStatement("SELECT pg_advisory_xact_lock(?)")){s.setLong(1,key);s.executeQuery().close();}}
    private static int pid(Connection c)throws Exception {try(var s=c.createStatement();var r=s.executeQuery("SELECT pg_backend_pid()")){r.next();return r.getInt(1);}}
    @SafeVarargs private static List<MvcResult> finished(Future<MvcResult>... requests) {
        var results=new ArrayList<MvcResult>(); var failures=new ArrayList<Exception>();
        for(var request:requests) {
            try { results.add(request.get(15,TimeUnit.SECONDS)); }
            catch(Exception error) { failures.add(error); }
        }
        if(!failures.isEmpty()) {
            var error=new AssertionError("Concurrent HTTP worker failure(s): "+failures.size());
            failures.forEach(error::addSuppressed); throw error;
        }
        return results;
    }
    private void decided()throws Exception {ok(as(reviewer,put(batchPath()).content(batch(item(app,"ACCEPTED",0),item(second,"REJECTED",0)))));}
    private Map<String,List<Map<String,Object>>> snapshot() {
        var result=new LinkedHashMap<String,List<Map<String,Object>>>();
        for(String table:List.of("applications","application_reviews","application_status_history","selection_result_audit","notifications","recruitment_rounds"))
            result.put(table,jdbc.queryForList("SELECT * FROM "+table+" ORDER BY id"));
        return result;
    }
    private String decision(long id){return "/api/v1/rounds/"+round+"/applications/"+id+"/decision";}
    private String batchPath(){return "/api/v1/rounds/"+round+"/application-decisions";}
    private String publishPath(){return "/api/v1/rounds/"+round+"/publish-results";}
    private static String body(String decision,long version,String message,String note){
        var fields=new LinkedHashMap<String,Object>(); fields.put("decision",decision); fields.put("version",version);
        fields.put("resultMessage",message); fields.put("internalNote",note); return new ObjectMapper().writeValueAsString(fields);
    }
    private static String item(long id,String decision,long version){return "{\"applicationId\":\""+id+"\",\"decision\":\""+decision+"\",\"version\":"+version+"}";}
    private static String batch(String...items){return "{\"decisions\":["+String.join(",",items)+"]}";}
    private org.springframework.security.core.Authentication auth(long id){
        String role=jdbc.queryForObject("SELECT system_role FROM users WHERE id=?",String.class,id);
        return UsernamePasswordAuthenticationToken.authenticated(new ClubHubPrincipal(id,"fictional",role),null,List.of());
    }
    private MvcResult as(long id,MockHttpServletRequestBuilder request)throws Exception{return mvc.perform(request.with(authentication(auth(id))).with(csrf()).contentType("application/json")).andReturn();}
    private JsonNode body(MvcResult result){return json.readTree(result.getResponse().getContentAsByteArray());}
    private void ok(MvcResult result)throws Exception{assertEquals(200,result.getResponse().getStatus(),result.getResponse().getContentAsString());assertTrue(result.getResponse().getHeader("Cache-Control").contains("no-store"));}
    private void problem(MvcResult result,int status,String reason)throws Exception{
        assertEquals(status,result.getResponse().getStatus(),result.getResponse().getContentAsString());
        assertTrue(result.getResponse().getContentType().startsWith("application/problem+json"));
        assertEquals(reason,body(result).has("reason")?body(result).path("reason").asText():null);
        if(status==409)assertEquals("RESOURCE_CONFLICT",body(result).path("code").asText());
        assertNotNull(UUID.fromString(body(result).path("traceId").asText()));
        assertFalse(result.getResponse().getContentAsString().contains("Task67 injected"));
        assertFalse(result.getResponse().getContentAsString().contains("SELECT "));
    }
    private long count(String table,String field,long id){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE "+field+"=?",Long.class,id);}
    private long student(String name){
        String s=UUID.randomUUID().toString().replace("-","");
        long id=jdbc.queryForObject("INSERT INTO users(tu_username,display_name) VALUES (?,?) RETURNING id",Long.class,"t67-"+s,name);users.add(id);
        jdbc.update("INSERT INTO student_profiles(user_id,student_code,student_status) VALUES (?,?,'ACTIVE')",id,"s"+s.substring(0,15));return id;
    }
    private long club(){long id=jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,created_by) VALUES (?,?,'Task67 fictional',?) RETURNING id",Long.class,category,"t67-"+suffix+clubs.size(),reviewer);clubs.add(id);return id;}
    private void assign(long user,long club,String role){
        long member=jdbc.queryForObject("INSERT INTO club_memberships(club_id,user_id,joined_at) VALUES (?,?,?) RETURNING id",Long.class,club,user,at(NOW.minusSeconds(6000)));
        jdbc.update("INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,assigned_by) VALUES (?,'Task67',?,?,?,?)",member,role,at(NOW.minusSeconds(6000)),at(NOW.plusSeconds(3600)),reviewer);
    }
    private long round(long c){return jdbc.queryForObject("""
            INSERT INTO recruitment_rounds(club_id,title,academic_year,semester,description,publication_status,published_at,opens_at,closes_at,confirmation_deadline,created_by)
            VALUES (?,'Task67',2569,1,'Fictional','PUBLISHED',?,?,?,?,?) RETURNING id
            """,Long.class,c,at(NOW.minusSeconds(10800)),at(NOW.minusSeconds(7200)),at(NOW),at(NOW.plusSeconds(7200)),reviewer);}
    private long application(long r,long c,long user){
        long id=jdbc.queryForObject("INSERT INTO applications(round_id,club_id,applicant_id,motivation,submitted_at) VALUES (?,?,?,'Task67 fictional motivation',?) RETURNING id",Long.class,r,c,user,at(NOW.minusSeconds(600)));
        jdbc.update("INSERT INTO application_status_history(application_id,to_status,actor_id,changed_at) VALUES (?,'SUBMITTED',?,?)",id,user,at(NOW.minusSeconds(600)));return id;
    }
    private static OffsetDateTime at(Instant i){return i.atOffset(ZoneOffset.UTC);}
    static class MutableClock extends Clock{
        final AtomicReference<Instant> now=new AtomicReference<>(NOW);
        void set(Instant value){now.set(value);}
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zone){return Clock.fixed(instant(),zone);}
        public Instant instant(){return now.get();}
    }
    @TestConfiguration static class Configuration{@Bean @Primary MutableClock selectionClock(){return new MutableClock();}}
}
