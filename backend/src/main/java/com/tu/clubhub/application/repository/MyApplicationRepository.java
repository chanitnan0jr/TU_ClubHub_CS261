package com.tu.clubhub.application.repository;

import com.tu.clubhub.application.dto.ApplicantApplicationDetail.DocumentLink;
import com.tu.clubhub.application.dto.ApplicantApplicationDetail.QuestionAnswer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MyApplicationRepository {

    private final JdbcTemplate jdbc;

    public MyApplicationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Internal projection. Never return this record directly from a controller.
     */
    public record ApplicationRow(
            long id,
            long applicantId,
            long clubId,
            String clubName,
            String clubImageUrl,
            String clubStatus,
            String studentStatus,
            long roundId,
            String roundTitle,
            int academicYear,
            int semester,
            Instant opensAt,
            Instant closesAt,
            Instant resultsPublishedAt,
            Instant confirmationDeadline,
            String publicationStatus,
            String status,
            Instant submittedAt,
            Instant respondedAt,
            Instant updatedAt,
            String motivation,
            String resultMessage) {
    }

    private static final String SELECT_APPLICATION = """
            SELECT
                a.id,
                a.applicant_id,
                a.club_id,
                c.name AS club_name,
                c.image_url AS club_image_url,
                c.status AS club_status,
                sp.student_status,
                r.id AS round_id,
                r.title AS round_title,
                r.academic_year,
                r.semester,
                r.opens_at,
                r.closes_at,
                r.results_published_at,
                r.confirmation_deadline,
                r.publication_status,
                a.status,
                a.submitted_at,
                a.responded_at,
                a.updated_at,
                a.motivation,
                a.result_message
            FROM applications a
            JOIN clubs c ON c.id = a.club_id
            JOIN recruitment_rounds r
                ON r.id = a.round_id AND r.club_id = a.club_id
            LEFT JOIN student_profiles sp ON sp.user_id = a.applicant_id
            """;

    public long countByApplicant(long applicantId) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM applications
                WHERE applicant_id = ?
                """, Long.class, applicantId);

        return count == null ? 0L : count;
    }

    public List<ApplicationRow> findByApplicant(
            long applicantId,
            int size,
            long offset) {

        return jdbc.query(
                SELECT_APPLICATION + """
                        WHERE a.applicant_id = ?
                        ORDER BY a.submitted_at DESC, a.id DESC
                        LIMIT ? OFFSET ?
                        """,
                (rs, rowNum) -> mapRow(rs),
                applicantId,
                size,
                offset);
    }

    public Optional<ApplicationRow> findOwnedById(
            long applicationId,
            long applicantId) {

        return jdbc.query(
                SELECT_APPLICATION + """
                        WHERE a.id = ? AND a.applicant_id = ?
                        """,
                (rs, rowNum) -> mapRow(rs),
                applicationId,
                applicantId
        ).stream().findFirst();
    }

    public boolean existsById(long applicationId) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM applications WHERE id = ?
                )
                """, Boolean.class, applicationId);

        return Boolean.TRUE.equals(exists);
    }

    public List<QuestionAnswer> findOwnedQuestionAnswers(
            long applicationId,
            long applicantId) {

        return jdbc.query("""
                SELECT
                    q.id AS question_id,
                    q.prompt,
                    q.is_required,
                    q.display_order,
                    ans.answer_text
                FROM applications a
                JOIN application_questions q ON q.round_id = a.round_id
                LEFT JOIN application_answers ans
                    ON ans.application_id = a.id
                    AND ans.question_id = q.id
                    AND ans.round_id = a.round_id
                WHERE a.id = ? AND a.applicant_id = ?
                ORDER BY q.display_order ASC, q.id ASC
                """,
                (rs, rowNum) -> new QuestionAnswer(
                        Long.toString(rs.getLong("question_id")),
                        rs.getString("prompt"),
                        rs.getBoolean("is_required"),
                        rs.getInt("display_order"),
                        rs.getString("answer_text")),
                applicationId,
                applicantId);
    }

    public List<DocumentLink> findOwnedLinks(
            long applicationId,
            long applicantId) {

        return jdbc.query("""
                SELECT l.label, l.url, l.display_order
                FROM application_links l
                JOIN applications a ON a.id = l.application_id
                WHERE a.id = ? AND a.applicant_id = ?
                ORDER BY l.display_order ASC, l.id ASC
                """,
                (rs, rowNum) -> new DocumentLink(
                        rs.getString("label"),
                        rs.getString("url"),
                        rs.getInt("display_order")),
                applicationId,
                applicantId);
    }

    /**
     * Only reads the withdrawal timestamp.
     * Internal reasons, reviewer identities and review history are excluded.
     */
    public Optional<Instant> findOwnedWithdrawalTime(
            long applicationId,
            long applicantId) {

        return jdbc.query("""
                SELECT h.changed_at
                FROM application_status_history h
                JOIN applications a ON a.id = h.application_id
                WHERE a.id = ?
                  AND a.applicant_id = ?
                  AND h.to_status = 'WITHDRAWN'
                ORDER BY h.changed_at DESC, h.id DESC
                LIMIT 1
                """,
                (rs, rowNum) -> instant(rs, "changed_at"),
                applicationId,
                applicantId
        ).stream().findFirst();
    }

    private ApplicationRow mapRow(ResultSet rs) throws SQLException {
        return new ApplicationRow(
                rs.getLong("id"),
                rs.getLong("applicant_id"),
                rs.getLong("club_id"),
                rs.getString("club_name"),
                rs.getString("club_image_url"),
                rs.getString("club_status"),
                rs.getString("student_status"),
                rs.getLong("round_id"),
                rs.getString("round_title"),
                rs.getInt("academic_year"),
                rs.getInt("semester"),
                instant(rs, "opens_at"),
                instant(rs, "closes_at"),
                instant(rs, "results_published_at"),
                instant(rs, "confirmation_deadline"),
                rs.getString("publication_status"),
                rs.getString("status"),
                instant(rs, "submitted_at"),
                instant(rs, "responded_at"),
                instant(rs, "updated_at"),
                rs.getString("motivation"),
                rs.getString("result_message"));
    }

    private Instant instant(ResultSet rs, String column)
            throws SQLException {

        OffsetDateTime value = rs.getObject(
                column, OffsetDateTime.class);

        return value == null ? null : value.toInstant();
    }
}