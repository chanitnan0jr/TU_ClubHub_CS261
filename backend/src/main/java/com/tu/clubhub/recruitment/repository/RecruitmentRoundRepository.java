package com.tu.clubhub.recruitment.repository;

import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.QuestionInput;
import com.tu.clubhub.recruitment.dto.RoundResponse;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Repository
public class RecruitmentRoundRepository {

    private final JdbcTemplate jdbcTemplate;

    public RecruitmentRoundRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<RecruitmentRound> findForUpdate(
            Long clubId,
            Long roundId) {

        String sql = """
                SELECT *
                FROM recruitment_rounds
                WHERE club_id = ? AND id = ?
                FOR UPDATE
                """;

        return jdbcTemplate.query(
                sql,
                this::mapRow,
                clubId,
                roundId
        ).stream().findFirst();
    }

    public Long createRound(
            Long clubId,
            Long createdBy,
            RoundWriteRequest request,
            Instant now) {

        String sql = """
                INSERT INTO recruitment_rounds (
                    club_id, title, academic_year, semester,
                    description, eligibility_text,
                    opens_at, closes_at, confirmation_deadline,
                    results_scheduled_at, publication_status,
                    created_by, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
                RETURNING id
                """;

        OffsetDateTime timestamp = now.atOffset(ZoneOffset.UTC);

        return jdbcTemplate.queryForObject(
                sql,
                Long.class,
                clubId,
                request.title(),
                request.academicYear(),
                request.semester(),
                request.description(),
                request.eligibilityText(),
                request.opensAt(),
                request.closesAt(),
                request.confirmationDeadline(),
                request.resultsScheduledAt(),
                createdBy,
                timestamp,
                timestamp);
    }

    public void insertQuestions(
            Long roundId,
            List<QuestionInput> questions) {

        String sql = """
                INSERT INTO application_questions (
                    round_id, prompt, is_required,
                    display_order, max_length
                )
                VALUES (?, ?, ?, ?, ?)
                """;

        for (QuestionInput question : questions) {
            jdbcTemplate.update(
                    sql,
                    roundId,
                    question.prompt(),
                    question.required(),
                    question.displayOrder(),
                    question.maxLength());
        }
    }

    public int updateDraft(
            Long clubId,
            Long roundId,
            RoundWriteRequest request,
            Instant now) {

        String sql = """
                UPDATE recruitment_rounds
                SET title = ?,
                    academic_year = ?,
                    semester = ?,
                    description = ?,
                    eligibility_text = ?,
                    opens_at = ?,
                    closes_at = ?,
                    confirmation_deadline = ?,
                    results_scheduled_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE club_id = ?
                  AND id = ?
                  AND version = ?
                  AND publication_status = 'DRAFT'
                  AND closed_at IS NULL
                """;

        return jdbcTemplate.update(
                sql,
                request.title(),
                request.academicYear(),
                request.semester(),
                request.description(),
                request.eligibilityText(),
                request.opensAt(),
                request.closesAt(),
                request.confirmationDeadline(),
                request.resultsScheduledAt(),
                now.atOffset(ZoneOffset.UTC),
                clubId,
                roundId,
                request.version());
    }

    public boolean hasApplications(Long roundId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM applications WHERE round_id = ?",
                Long.class,
                roundId);

        return count != null && count > 0;
    }

    /** Includes withdrawn/rejected applications for the self-review restriction. */
    public boolean hasApplicationByApplicant(Long roundId, Long applicantId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM applications
                    WHERE round_id = ? AND applicant_id = ?
                )
                """, Boolean.class, roundId, applicantId);

        return Boolean.TRUE.equals(exists);
    }

    public List<RoundResponse.Question> findQuestions(Long roundId) {
        return jdbcTemplate.query("""
                SELECT id, prompt, is_required, display_order, max_length
                FROM application_questions
                WHERE round_id = ?
                ORDER BY display_order, id
                """,
                (rs, rowNum) -> new RoundResponse.Question(
                        rs.getString("id"),
                        rs.getString("prompt"),
                        rs.getBoolean("is_required"),
                        rs.getInt("display_order"),
                        rs.getInt("max_length")),
                roundId);
    }

    public void deleteQuestions(Long roundId) {
        jdbcTemplate.update(
                "DELETE FROM application_questions WHERE round_id = ?",
                roundId);
    }

    public int publishRound(
            Long clubId,
            Long roundId,
            Long expectedVersion,
            Instant now) {

        String sql = """
                UPDATE recruitment_rounds
                SET publication_status = 'PUBLISHED',
                    published_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE club_id = ?
                  AND id = ?
                  AND version = ?
                  AND publication_status = 'DRAFT'
                  AND closed_at IS NULL
                  AND closes_at > ?
                """;

        OffsetDateTime time = now.atOffset(ZoneOffset.UTC);

        return jdbcTemplate.update(
                sql,
                time,
                time,
                clubId,
                roundId,
                expectedVersion,
                time);
    }

    public int closeRound(
            Long clubId,
            Long roundId,
            Long expectedVersion,
            Instant closedAt) {

        String sql = """
                UPDATE recruitment_rounds
                SET closed_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE club_id = ?
                  AND id = ?
                  AND version = ?
                  AND publication_status = 'PUBLISHED'
                  AND closed_at IS NULL
                  AND opens_at <= ?
                  AND closes_at > ?
                """;

        OffsetDateTime time = closedAt.atOffset(ZoneOffset.UTC);

        return jdbcTemplate.update(
                sql,
                time,
                time,
                clubId,
                roundId,
                expectedVersion,
                time,
                time);
    }

    private RecruitmentRound mapRow(ResultSet rs, int rowNum)
            throws SQLException {

        return new RecruitmentRound(
                rs.getLong("id"),
                rs.getLong("club_id"),
                rs.getString("title"),
                rs.getInt("academic_year"),
                rs.getInt("semester"),
                rs.getString("description"),
                rs.getString("eligibility_text"),
                instant(rs, "opens_at"),
                instant(rs, "closes_at"),
                instant(rs, "closed_at"),
                instant(rs, "results_scheduled_at"),
                instant(rs, "confirmation_deadline"),
                rs.getString("publication_status"),
                instant(rs, "published_at"),
                instant(rs, "results_published_at"),
                rs.getLong("created_by"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"),
                rs.getLong("version"));
    }

    private Instant instant(ResultSet rs, String column)
            throws SQLException {

        OffsetDateTime value =
                rs.getObject(column, OffsetDateTime.class);

        return value == null ? null : value.toInstant();
    }
}