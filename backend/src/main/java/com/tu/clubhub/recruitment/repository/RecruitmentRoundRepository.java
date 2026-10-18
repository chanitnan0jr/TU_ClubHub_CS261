package com.tu.clubhub.recruitment.repository;

import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class RecruitmentRoundRepository {

    private final JdbcTemplate jdbcTemplate;

    public RecruitmentRoundRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<RecruitmentRound> findForUpdate(
            Long clubId, Long roundId) {

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

        OffsetDateTime time =
                closedAt.atOffset(java.time.ZoneOffset.UTC);

        return jdbcTemplate.update(
                sql,
                time,
                time,
                clubId,
                roundId,
                expectedVersion,
                time,
                time
        );
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
                rs.getLong("version")
        );
    }

    private Instant instant(ResultSet rs, String column)
            throws SQLException {

        OffsetDateTime value =
                rs.getObject(column, OffsetDateTime.class);

        return value == null ? null : value.toInstant();
    }
}