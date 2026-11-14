package com.tu.clubhub.application.repository;

import com.tu.clubhub.application.dto.ApplicationDecisionRequest;
import com.tu.clubhub.application.dto.CommitteeApplicationDetail;
import com.tu.clubhub.application.dto.CommitteeApplicationDetail.History;
import com.tu.clubhub.application.dto.CommitteeApplicationDetail.Review;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Explicit projections and transaction-scoped PostgreSQL locks; no entity serialization. */
@Repository
public class SelectionResultRepository {
    public record Round(long id, long clubId, String publicationStatus, Instant publishedAt,
            Instant closesAt, Instant closedAt, Instant confirmationDeadline, Instant resultsPublishedAt, long version) {}
    public record Application(long id, long roundId, long clubId, long applicantId, String status,
            String resultMessage, String decidedBy, Instant decidedAt, Instant respondedAt, long version) {}

    private final NamedParameterJdbcTemplate jdbc;
    private final CommitteeApplicationRepository reads;

    public SelectionResultRepository(NamedParameterJdbcTemplate jdbc, CommitteeApplicationRepository reads) {
        this.jdbc = jdbc; this.reads = reads;
    }

    public void lockTimeout(String value) {
        jdbc.queryForObject("SELECT set_config('lock_timeout', :timeout, true)", params("timeout", value), String.class);
    }

    public Optional<Round> round(long id, boolean lock, boolean exclusive) {
        return jdbc.query("SELECT * FROM recruitment_rounds WHERE id=:id"
                        + (lock ? exclusive ? " FOR UPDATE" : " FOR SHARE" : ""), params("id", id),
                (rs, row) -> new Round(rs.getLong("id"), rs.getLong("club_id"), rs.getString("publication_status"),
                        time(rs, "published_at"), time(rs, "closes_at"), time(rs, "closed_at"), time(rs, "confirmation_deadline"),
                        time(rs, "results_published_at"), rs.getLong("version"))).stream().findFirst();
    }

    public List<Application> lockApplications(long round, List<Long> ids) {
        return jdbc.query("SELECT * FROM applications WHERE round_id=:round"
                        + (ids == null ? "" : " AND id IN (:ids)") + " ORDER BY id FOR UPDATE",
                params("round", round).addValue("ids", ids), (rs, row) -> application(rs));
    }

    public Optional<Application> application(long id) {
        return jdbc.query("SELECT * FROM applications WHERE id=:id", params("id", id),
                (rs, row) -> application(rs)).stream().findFirst();
    }

    public void decide(Application before, ApplicationDecisionRequest request, long actor, Instant now) {
        jdbc.update("""
                UPDATE applications SET status=:decision, result_message=:message, decided_by=:actor,
                    decided_at=:at, updated_at=:at, version=version+1 WHERE id=:id
                """, params("id", before.id()).addValue("decision", request.decision()).addValue("message", request.resultMessage())
                .addValue("actor", actor).addValue("at", at(now)));
        if (!before.status().equals(request.decision())) {
            jdbc.update("""
                    INSERT INTO application_status_history(application_id,from_status,to_status,actor_id,reason,changed_at)
                    VALUES (:id,:before,:after,:actor,'COMMITTEE_DECISION',:at)
                    """, params("id", before.id()).addValue("before", before.status()).addValue("after", request.decision())
                    .addValue("actor", actor).addValue("at", at(now)));
        }
        if (request.internalNote() != null && !request.internalNote().isBlank()) {
            jdbc.update("""
                    INSERT INTO application_reviews(application_id,reviewer_id,recommendation,internal_comment,created_at,updated_at)
                    VALUES (:id,:actor,:recommendation,:note,:at,:at)
                    ON CONFLICT (application_id,reviewer_id) DO UPDATE SET
                        recommendation=EXCLUDED.recommendation, internal_comment=EXCLUDED.internal_comment,
                        updated_at=EXCLUDED.updated_at, version=application_reviews.version+1
                    """, params("id", before.id()).addValue("actor", actor).addValue("at", at(now))
                    .addValue("recommendation", request.decision().equals("ACCEPTED") ? "ACCEPT" : "REJECT")
                    .addValue("note", request.internalNote()));
        }
    }

    public void publish(Round round, List<Application> applications, Instant now) {
        jdbc.update("UPDATE recruitment_rounds SET results_published_at=:at, updated_at=:at, version=version+1 WHERE id=:id",
                params("id", round.id()).addValue("at", at(now)));
        for (Application app : applications) {
            if (!List.of("ACCEPTED", "REJECTED").contains(app.status())) continue;
            jdbc.update("""
                    INSERT INTO notifications(recipient_id,application_id,type,title,message,deduplication_key,created_at)
                    VALUES (:recipient,:id,'RESULT_PUBLISHED','Selection results published',
                        'Your selection result is available in My applications.',:key,:at)
                    """, params("recipient", app.applicantId()).addValue("id", app.id()).addValue("at", at(now))
                    .addValue("key", "result-published:" + round.id() + ":" + app.id()));
        }
    }

    public void audit(Round round, Long application, long actor, String action, Instant now, UUID trace,
            String before, String after) {
        jdbc.update("""
                INSERT INTO selection_result_audit(round_id,club_id,application_id,actor_id,action,occurred_at,trace_id,before_state,after_state)
                VALUES (:round,:club,:app,:actor,:action,:at,:trace,CAST(:before AS jsonb),CAST(:after AS jsonb))
                """, params("round", round.id()).addValue("club", round.clubId()).addValue("app", application)
                .addValue("actor", actor).addValue("action", action).addValue("at", at(now)).addValue("trace", trace)
                .addValue("before", before).addValue("after", after));
    }

    public CommitteeApplicationDetail detail(Application app) {
        var row = reads.findDetail(app.clubId(), app.id()).orElseThrow();
        var summary = row.summary();
        var reviews = jdbc.query("""
                SELECT rv.*,u.display_name FROM application_reviews rv JOIN users u ON u.id=rv.reviewer_id
                WHERE rv.application_id=:id ORDER BY rv.created_at,rv.id
                """, params("id", app.id()), (rs, n) -> new Review(rs.getString("id"), rs.getString("reviewer_id"),
                rs.getString("display_name"), rs.getString("recommendation"), rs.getString("internal_comment"),
                time(rs,"created_at"), time(rs,"updated_at"), rs.getLong("version")));
        var history = jdbc.query("SELECT * FROM application_status_history WHERE application_id=:id ORDER BY changed_at,id",
                params("id", app.id()), (rs, n) -> new History(rs.getString("from_status"), rs.getString("to_status"),
                rs.getString("actor_id"), rs.getString("reason"), time(rs,"changed_at")));
        return new CommitteeApplicationDetail(summary.id(), Long.toString(app.clubId()), summary.roundId(), summary.applicant(),
                row.motivation(), reads.questionsWithAnswers(app.roundId(), app.id()), reads.links(app.id()), app.status(),
                app.resultMessage(), app.decidedBy(), app.decidedAt(), app.respondedAt(), app.version(), summary.submittedAt(), reviews, history);
    }

    private static Application application(ResultSet rs) throws SQLException {
        return new Application(rs.getLong("id"), rs.getLong("round_id"), rs.getLong("club_id"), rs.getLong("applicant_id"),
                rs.getString("status"), rs.getString("result_message"), rs.getString("decided_by"), time(rs,"decided_at"),
                time(rs,"responded_at"), rs.getLong("version"));
    }
    private static Instant time(ResultSet rs, String name) throws SQLException {
        OffsetDateTime value = rs.getObject(name, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
    private static MapSqlParameterSource params(String name, Object value) { return new MapSqlParameterSource(name, value); }
    private static OffsetDateTime at(Instant value) { return value.atOffset(ZoneOffset.UTC); }
}
