package com.tu.clubhub.application.repository;

import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail.DocumentLink;
import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail.QuestionAnswer;
import com.tu.clubhub.application.dto.CommitteeClubApplicationSummary;
import com.tu.clubhub.application.dto.CommitteeClubApplicationSummary.Applicant;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Explicit read projections; club scope and self-review exclusions precede pagination/count. */
@Repository
public class CommitteeApplicationRepository {
    public record RoundScope(long clubId, String publicationStatus, boolean published) {}
    public record ApplicationScope(long clubId, long roundId) {}
    public record DetailRow(CommitteeClubApplicationSummary summary, String motivation) {}
    public record Filter(long clubId, long viewerId, Long roundId, String status, String q) {}

    private static final String FROM = """
            FROM applications a
            JOIN recruitment_rounds r ON r.id = a.round_id AND r.club_id = a.club_id
            JOIN users u ON u.id = a.applicant_id
            JOIN student_profiles s ON s.user_id = a.applicant_id
            """;
    private static final String COLUMNS = """
            a.id, a.round_id, a.status, a.submitted_at, u.id AS applicant_id,
            u.display_name, u.email, s.student_code, s.faculty_name,
            s.department_name, s.program_name, s.study_year
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public CommitteeApplicationRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<RoundScope> findRound(long id) {
        return jdbc.query("SELECT club_id, publication_status, published_at IS NOT NULL AS published FROM recruitment_rounds WHERE id = :id",
                new MapSqlParameterSource("id", id), (rs, row) -> new RoundScope(rs.getLong("club_id"),
                        rs.getString("publication_status"), rs.getBoolean("published"))).stream().findFirst();
    }

    public Optional<ApplicationScope> findApplicationScope(long id) {
        return jdbc.query("SELECT club_id, round_id FROM applications WHERE id = :id", new MapSqlParameterSource("id", id),
                (rs, row) -> new ApplicationScope(rs.getLong("club_id"), rs.getLong("round_id"))).stream().findFirst();
    }

    public boolean isApplicant(long viewerId, long roundId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM applications WHERE applicant_id = :viewer AND round_id = :round)
                """, new MapSqlParameterSource("viewer", viewerId).addValue("round", roundId), Boolean.class));
    }

    public long count(Filter filter) {
        return jdbc.queryForObject("SELECT COUNT(*) " + FROM + predicate(filter), parameters(filter), Long.class);
    }

    public List<CommitteeClubApplicationSummary> list(Filter filter, int page, int size) {
        return jdbc.query("SELECT " + COLUMNS + FROM + predicate(filter)
                        + " ORDER BY a.submitted_at ASC, a.id ASC LIMIT :size OFFSET :offset",
                parameters(filter).addValue("size", size).addValue("offset", (long) page * size),
                (rs, row) -> summary(rs));
    }

    public Optional<DetailRow> findDetail(long clubId, long applicationId) {
        return jdbc.query("SELECT " + COLUMNS + ", a.motivation " + FROM
                        + " WHERE a.club_id = :club AND a.id = :id",
                new MapSqlParameterSource("club", clubId).addValue("id", applicationId),
                (rs, row) -> new DetailRow(summary(rs), rs.getString("motivation"))).stream().findFirst();
    }

    public List<QuestionAnswer> questionsWithAnswers(long roundId, long applicationId) {
        return jdbc.query("""
                SELECT q.id, q.prompt, q.is_required, q.display_order, ans.answer_text
                FROM application_questions q
                LEFT JOIN application_answers ans ON ans.question_id = q.id AND ans.round_id = q.round_id
                    AND ans.application_id = :application
                WHERE q.round_id = :round
                ORDER BY q.display_order ASC, q.id ASC
                """, new MapSqlParameterSource("round", roundId).addValue("application", applicationId),
                (rs, row) -> new QuestionAnswer(rs.getString("id"), rs.getString("prompt"), rs.getBoolean("is_required"),
                        rs.getInt("display_order"), rs.getString("answer_text")));
    }

    public List<DocumentLink> links(long applicationId) {
        return jdbc.query("""
                SELECT id, label, url, display_order FROM application_links
                WHERE application_id = :id ORDER BY display_order ASC, id ASC
                """, new MapSqlParameterSource("id", applicationId), (rs, row) -> new DocumentLink(
                rs.getString("id"), rs.getString("label"), rs.getString("url"), rs.getInt("display_order")));
    }

    private static String predicate(Filter filter) {
        String sql = """
                 WHERE a.club_id = :club AND r.publication_status = 'PUBLISHED' AND r.published_at IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM applications own WHERE own.round_id = a.round_id AND own.applicant_id = :viewer)
                """;
        if (filter.roundId() != null) sql += " AND a.round_id = :round";
        if (filter.status() != null) sql += " AND a.status = :status";
        if (filter.q() != null) sql += " AND (strpos(lower(u.display_name), lower(:q)) > 0 OR strpos(lower(s.student_code), lower(:q)) > 0)";
        return sql;
    }

    private static MapSqlParameterSource parameters(Filter filter) {
        return new MapSqlParameterSource("club", filter.clubId()).addValue("viewer", filter.viewerId())
                .addValue("round", filter.roundId()).addValue("status", filter.status()).addValue("q", filter.q());
    }

    private static CommitteeClubApplicationSummary summary(ResultSet rs) throws SQLException {
        Number year = (Number) rs.getObject("study_year");
        var applicant = new Applicant(rs.getString("applicant_id"), rs.getString("student_code"), rs.getString("display_name"),
                rs.getString("email"), rs.getString("faculty_name"), rs.getString("department_name"), rs.getString("program_name"),
                year == null ? null : year.intValue());
        return new CommitteeClubApplicationSummary(rs.getString("id"), rs.getString("round_id"), applicant,
                rs.getObject("submitted_at", OffsetDateTime.class).toInstant(), rs.getString("status"));
    }
}
