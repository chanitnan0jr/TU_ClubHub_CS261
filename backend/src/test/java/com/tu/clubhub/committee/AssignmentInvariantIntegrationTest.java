package com.tu.clubhub.committee;

import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/** Database invariant, including native writes; no service-side mock can prove this. */
@SpringBootTest
@ActiveProfiles({"test", "seedtest"})
@Transactional
class AssignmentInvariantIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");
    @Autowired JdbcTemplate jdbc;
    long user, membership;

    @BeforeEach void fixture() {
        user = jdbc.queryForObject("INSERT INTO users(tu_username,display_name) VALUES (?,'Fictional assignment user') RETURNING id", Long.class, "t78-" + UUID.randomUUID());
        jdbc.update("INSERT INTO student_profiles(user_id,student_code,student_status) VALUES (?,?,'ACTIVE')", user, "s" + UUID.randomUUID().toString().substring(0, 16));
        long category = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id", Long.class, "t78-" + UUID.randomUUID());
        long club = jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,created_by) VALUES (?,?,'Fictional club',?) RETURNING id", Long.class, category, "t78-" + UUID.randomUUID(), user);
        membership = jdbc.queryForObject("INSERT INTO club_memberships(user_id,club_id,joined_at) VALUES (?,?,?) RETURNING id",
                Long.class, user, club, NOW.minusSeconds(3600).atOffset(ZoneOffset.UTC));
    }

    @Test void nativeOverlappingUnrevokedTermsAreRejected() {
        insert("COMMITTEE", 0, 60);
        var failure = assertThrows(DataIntegrityViolationException.class, () -> insert("COMMITTEE", 30, 90));
        SQLException sql = null;
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) if (cause instanceof SQLException value) sql = value;
        assertNotNull(sql); assertEquals("23P01", sql.getSQLState());
        assertEquals("excl_committee_active_term", ((org.postgresql.util.PSQLException) sql).getServerErrorMessage().getConstraint());
    }

    @Test void adjacentTermsAndDifferentRolesAreAllowed() {
        insert("COMMITTEE", 0, 60); insert("COMMITTEE", 60, 120); insert("PRESIDENT", 0, 120);
        assertEquals(3L, jdbc.queryForObject("SELECT COUNT(*) FROM club_committee_assignments WHERE membership_id=?", Long.class, membership));
    }

    @Test void nativeTermUpdateCannotBypassTheOverlapConstraint() {
        long first = insert("COMMITTEE", 0, 60);
        insert("COMMITTEE", 60, 120);
        var failure = assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE club_committee_assignments SET ends_at=? WHERE id=?", NOW.plusSeconds(90).atOffset(ZoneOffset.UTC), first));
        SQLException sql = null;
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) if (cause instanceof SQLException value) sql = value;
        assertNotNull(sql); assertEquals("23P01", sql.getSQLState());
        assertEquals("excl_committee_active_term", ((org.postgresql.util.PSQLException) sql).getServerErrorMessage().getConstraint());
    }

    @Test void revokedHistoryDoesNotBlockReplacementAtTheSameStart() {
        long previous = insert("COMMITTEE", 0, 60);
        jdbc.update("UPDATE club_committee_assignments SET status='REVOKED',revoked_at=created_at,revoked_by=? WHERE id=?", user, previous);
        long replacement = insert("COMMITTEE", 0, 120);
        assertNotEquals(previous, replacement);
        assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM club_committee_assignments WHERE membership_id=?", Long.class, membership));
    }

    private long insert(String role, int start, int end) {
        return jdbc.queryForObject("""
                INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,assigned_by)
                VALUES (?,'Committee',?,?,?,?) RETURNING id
                """, Long.class, membership, role, NOW.plusSeconds(start).atOffset(ZoneOffset.UTC), NOW.plusSeconds(end).atOffset(ZoneOffset.UTC), user);
    }
}
