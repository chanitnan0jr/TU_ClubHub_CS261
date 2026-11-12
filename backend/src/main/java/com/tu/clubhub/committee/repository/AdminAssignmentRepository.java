package com.tu.clubhub.committee.repository;

import com.tu.clubhub.committee.dto.AssignmentView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** All write callers must hold the service transaction and documented row locks. */
@Repository
public class AdminAssignmentRepository {
    public record Account(long id, String role, String status) {}
    public record Membership(long id, long userId, long clubId, String status, Instant joinedAt, Instant endedAt) {}
    private final JdbcTemplate jdbc;
    public AdminAssignmentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<Account> account(long userId) {
        return jdbc.query("SELECT id,system_role,account_status FROM users WHERE id=?",
                (rs, row) -> new Account(rs.getLong("id"), rs.getString("system_role"), rs.getString("account_status")), userId).stream().findFirst();
    }
    public List<Account> lockAccounts(long actor, long target) {
        return jdbc.query("SELECT id,system_role,account_status FROM users WHERE id IN (?,?) ORDER BY id FOR SHARE",
                (rs, row) -> new Account(rs.getLong("id"), rs.getString("system_role"), rs.getString("account_status")), actor, target);
    }
    public Optional<String> lockStudent(long userId) {
        return jdbc.query("SELECT student_status FROM student_profiles WHERE user_id=? FOR UPDATE",
                (rs, row) -> rs.getString("student_status"), userId).stream().findFirst();
    }
    public Optional<Membership> membership(long id, boolean lock) {
        return jdbc.query("SELECT id,user_id,club_id,status,joined_at,ended_at FROM club_memberships WHERE id=?" + (lock ? " FOR UPDATE" : ""),
                (rs, row) -> new Membership(rs.getLong("id"), rs.getLong("user_id"), rs.getLong("club_id"), rs.getString("status"),
                        instant(rs, "joined_at"), instant(rs, "ended_at")), id).stream().findFirst();
    }
    public void lockAssignments(long membershipId) {
        jdbc.query("SELECT id FROM club_committee_assignments WHERE membership_id=? ORDER BY id FOR UPDATE",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> {}, membershipId);
    }
    public Optional<String> lockClub(long clubId) {
        return jdbc.query("SELECT status FROM clubs WHERE id=? FOR SHARE", (rs, row) -> rs.getString("status"), clubId).stream().findFirst();
    }
    public void lockTimeout(String timeout) { jdbc.queryForObject("SELECT set_config('lock_timeout',?,true)", String.class, timeout); }
    public boolean overlaps(long membershipId, String role, Instant start, Instant end, Long excluding) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM club_committee_assignments
                WHERE membership_id=? AND permission_role=? AND status='ACTIVE' AND revoked_at IS NULL
                  AND starts_at < ? AND ? < ends_at AND (?::bigint IS NULL OR id <> ?))
                """, Boolean.class, membershipId, role, at(end), at(start), excluding, excluding));
    }
    public long insert(long membershipId, String position, String role, Instant start, Instant end,
            long actor, String reason, Long replaces, Instant now) {
        return jdbc.queryForObject("""
                INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,
                    assigned_by,assignment_reason,replaces_assignment_id,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id
                """, Long.class, membershipId, position, role, at(start), at(end), actor, reason, replaces, at(now), at(now));
    }
    public int revoke(long id, long expectedVersion, long actor, String reason, Instant now) {
        return jdbc.update("""
                UPDATE club_committee_assignments SET status='REVOKED',revoked_at=?,revoked_by=?,revocation_reason=?,
                    updated_at=?,version=version+1
                WHERE id=? AND version=? AND status='ACTIVE' AND revoked_at IS NULL
                """, at(now), actor, reason, at(now), id, expectedVersion);
    }
    public void audit(long id, long actor, String action, String reason, Instant now, UUID traceId) {
        jdbc.update("INSERT INTO committee_assignment_audit(assignment_id,actor_id,action,reason,occurred_at,trace_id) VALUES (?,?,?,?,?,?)",
                id, actor, action, reason, at(now), traceId);
    }
    public Optional<AssignmentView> find(long id) {
        return jdbc.query("""
                SELECT a.*,m.club_id,m.user_id FROM club_committee_assignments a
                JOIN club_memberships m ON m.id=a.membership_id WHERE a.id=?
                """, (rs, row) -> new AssignmentView(rs.getString("id"), rs.getString("club_id"), rs.getString("membership_id"), rs.getString("user_id"),
                        rs.getString("position_name"), rs.getString("permission_role"), instant(rs,"starts_at"), instant(rs,"ends_at"), rs.getString("status"),
                        rs.getString("assigned_by"), rs.getString("assignment_reason"), rs.getString("replaces_assignment_id"), rs.getString("revoked_by"),
                        instant(rs,"revoked_at"), rs.getString("revocation_reason"), instant(rs,"created_at"), instant(rs,"updated_at"), rs.getLong("version")), id).stream().findFirst();
    }
    private static OffsetDateTime at(Instant value) { return value.atOffset(ZoneOffset.UTC); }
    private static Instant instant(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column, OffsetDateTime.class); return value == null ? null : value.toInstant();
    }
}
