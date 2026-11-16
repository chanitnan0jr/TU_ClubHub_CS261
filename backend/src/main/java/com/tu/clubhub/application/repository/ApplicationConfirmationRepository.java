package com.tu.clubhub.application.repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ApplicationConfirmationRepository {

    public record ApplicationScope(
            long id,
            long roundId,
            long clubId,
            long applicantId
    ) {}

    public record ApplicationState(
            long id,
            long roundId,
            long clubId,
            long applicantId,
            String status,
            long version,
            Instant respondedAt
    ) {}

    private final NamedParameterJdbcTemplate jdbc;

    public ApplicationConfirmationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ApplicationScope> findScope(long applicationId) {
        return jdbc.query("""
                SELECT id, round_id, club_id, applicant_id
                FROM applications
                WHERE id = :id
                """,
                new MapSqlParameterSource("id", applicationId),
                (rs, rowNum) -> new ApplicationScope(
                        rs.getLong("id"),
                        rs.getLong("round_id"),
                        rs.getLong("club_id"),
                        rs.getLong("applicant_id")
                )).stream().findFirst();
    }

    public Optional<ApplicationState> lockApplication(long applicationId, long roundId) {
        return jdbc.query("""
                SELECT id, round_id, club_id, applicant_id, status, version, responded_at
                FROM applications
                WHERE id = :id AND round_id = :roundId
                FOR UPDATE
                """,
                new MapSqlParameterSource("id", applicationId)
                        .addValue("roundId", roundId),
                (rs, rowNum) -> new ApplicationState(
                        rs.getLong("id"),
                        rs.getLong("round_id"),
                        rs.getLong("club_id"),
                        rs.getLong("applicant_id"),
                        rs.getString("status"),
                        rs.getLong("version"),
                        rs.getObject("responded_at", OffsetDateTime.class) == null ? null
                                : rs.getObject("responded_at", OffsetDateTime.class).toInstant()
                )).stream().findFirst();
    }

    public record RoundState(
            long id,
            long clubId,
            String publicationStatus,
            Instant resultsPublishedAt,
            Instant confirmationDeadline
    ) {}

    public Optional<RoundState> lockRound(long roundId) {
        return jdbc.query("""
                SELECT id, club_id, publication_status,
                       results_published_at, confirmation_deadline
                FROM recruitment_rounds
                WHERE id = :id
                FOR SHARE
                """,
                new MapSqlParameterSource("id", roundId),
                (rs, rowNum) -> new RoundState(
                        rs.getLong("id"),
                        rs.getLong("club_id"),
                        rs.getString("publication_status"),
                        rs.getObject("results_published_at",
                                java.time.OffsetDateTime.class) == null
                                ? null
                                : rs.getObject("results_published_at",
                                        java.time.OffsetDateTime.class).toInstant(),
                        rs.getObject("confirmation_deadline",
                                java.time.OffsetDateTime.class).toInstant()
                )).stream().findFirst();
    }

    public boolean membershipExists(long clubId, long userId) {
        Boolean exists = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM club_memberships
                    WHERE club_id = :clubId
                      AND user_id = :userId
                )
                """,
                new MapSqlParameterSource("clubId", clubId)
                        .addValue("userId", userId),
                Boolean.class);

        return Boolean.TRUE.equals(exists);
    }

    public int updateApplicationStatus(
            long applicationId,
            long expectedVersion,
            String newStatus,
            Instant respondedAt
    ) {
        return jdbc.update("""
                UPDATE applications
                SET status = :newStatus,
                    responded_at = :respondedAt,
                    updated_at = :respondedAt,
                    version = version + 1
                WHERE id = :applicationId
                  AND status = 'ACCEPTED'
                  AND version = :expectedVersion
                """,
                new MapSqlParameterSource("applicationId", applicationId)
                        .addValue("expectedVersion", expectedVersion)
                        .addValue("newStatus", newStatus)
                        .addValue("respondedAt", at(respondedAt)));
    }

    public void insertStatusHistory(
            long applicationId,
            long actorId,
            String newStatus,
            Instant changedAt
    ) {
        jdbc.update("""
                INSERT INTO application_status_history (
                    application_id,
                    from_status,
                    to_status,
                    actor_id,
                    reason,
                    changed_at
                )
                VALUES (
                    :applicationId,
                    'ACCEPTED',
                    :newStatus,
                    :actorId,
                    :reason,
                    :changedAt
                )
                """,
                new MapSqlParameterSource("applicationId", applicationId)
                        .addValue("actorId", actorId)
                        .addValue("newStatus", newStatus)
                        .addValue("reason", "CONFIRMED".equals(newStatus) ? "APPLICANT_CONFIRMED" : "APPLICANT_DECLINED")
                        .addValue("changedAt", at(changedAt)));
    }

    public long insertMembership(
            long clubId,
            long userId,
            long applicationId,
            Instant joinedAt
    ) {
        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships (
                    club_id,
                    user_id,
                    source_application_id,
                    status,
                    joined_at,
                    updated_at
                )
                VALUES (
                    :clubId,
                    :userId,
                    :applicationId,
                    'ACTIVE',
                    :joinedAt,
                    :joinedAt
                )
                RETURNING id
                """,
                new MapSqlParameterSource("clubId", clubId)
                        .addValue("userId", userId)
                        .addValue("applicationId", applicationId)
                        .addValue("joinedAt", at(joinedAt)),
                Long.class);

        if (membershipId == null) {
            throw new IllegalStateException("Membership ID was not returned");
        }

        return membershipId;
    }

    public void insertMembershipHistory(
            long membershipId,
            long actorId,
            Instant changedAt
    ) {
        jdbc.update("""
                INSERT INTO membership_history (
                    membership_id,
                    old_status,
                    new_status,
                    actor_id,
                    reason,
                    changed_at
                )
                VALUES (
                    :membershipId,
                    NULL,
                    'ACTIVE',
                    :actorId,
                    'APPLICANT_CONFIRMED',
                    :changedAt
                )
                """,
                new MapSqlParameterSource("membershipId", membershipId)
                        .addValue("actorId", actorId)
                        .addValue("changedAt", at(changedAt)));
    }

    private static OffsetDateTime at(Instant value) {
        return value.atOffset(ZoneOffset.UTC);
    }

    // Applicant locks precede club/round/application. NO KEY UPDATE is compatible
    // with the users KEY SHARE lock taken by notification FK checks during publish.
    public Optional<String> lockAccount(long userId) {
        return jdbc.query("SELECT account_status FROM users WHERE id = :id FOR NO KEY UPDATE",
                new MapSqlParameterSource("id", userId), (rs, row) -> rs.getString(1)).stream().findFirst();
    }

    public Optional<String> lockStudent(long userId) {
        return jdbc.query("SELECT student_status FROM student_profiles WHERE user_id = :id FOR UPDATE",
                new MapSqlParameterSource("id", userId), (rs, row) -> rs.getString(1)).stream().findFirst();
    }

    public Optional<String> lockClub(long clubId) {
        return jdbc.query("SELECT status FROM clubs WHERE id = :id FOR SHARE",
                new MapSqlParameterSource("id", clubId), (rs, row) -> rs.getString(1)).stream().findFirst();
    }

    public long activeMembershipCount(long userId, Instant now) {
        return jdbc.queryForObject("""
                SELECT count(DISTINCT club_id) FROM club_memberships
                WHERE user_id = :userId AND status = 'ACTIVE'
                  AND joined_at <= :now AND ended_at IS NULL
                """, new MapSqlParameterSource("userId", userId).addValue("now", at(now)), Long.class);
    }

    public Optional<Long> membershipForApplication(long applicationId) {
        return jdbc.query("SELECT id FROM club_memberships WHERE source_application_id = :id",
                new MapSqlParameterSource("id", applicationId), (rs, row) -> rs.getLong(1)).stream().findFirst();
    }

}
