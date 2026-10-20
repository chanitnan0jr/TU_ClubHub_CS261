package com.tu.clubhub.application.repository;

import com.tu.clubhub.application.domain.ValidatedApplicationSubmission.Answer;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission.Link;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** JDBC persistence for applicant submission. Locks require the caller's transaction. */
@Repository
public class ApplicationRepository {
    public record Round(long id, long clubId, String publicationStatus, Instant publishedAt,
            Instant opensAt, Instant closesAt, Instant closedAt) {}
    public record Question(long id, boolean required, int maxLength) {}
    public record Memberships(boolean alreadyMember, long distinctClubs) {}

    private final JdbcTemplate jdbc;

    public ApplicationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<String> lockAccount(long userId) {
        return jdbc.query("SELECT account_status FROM users WHERE id = ? FOR UPDATE",
                (rs, row) -> rs.getString("account_status"), userId).stream().findFirst();
    }

    public Optional<String> lockStudentStatus(long userId) {
        return jdbc.query("SELECT student_status FROM student_profiles WHERE user_id = ? FOR UPDATE",
                (rs, row) -> rs.getString("student_status"), userId).stream().findFirst();
    }

    /** The same row is locked by round close/publish and question-edit services. */
    public Optional<Round> lockRound(long roundId) {
        return jdbc.query("""
                SELECT id, club_id, publication_status, published_at, opens_at, closes_at, closed_at
                FROM recruitment_rounds WHERE id = ? FOR UPDATE
                """, (rs, row) -> new Round(rs.getLong("id"), rs.getLong("club_id"),
                rs.getString("publication_status"), instant(rs.getObject("published_at", OffsetDateTime.class)),
                instant(rs.getObject("opens_at", OffsetDateTime.class)),
                instant(rs.getObject("closes_at", OffsetDateTime.class)),
                instant(rs.getObject("closed_at", OffsetDateTime.class))), roundId).stream().findFirst();
    }

    public Optional<String> lockClubStatus(long clubId) {
        return jdbc.query("SELECT status FROM clubs WHERE id = ? FOR SHARE",
                (rs, row) -> rs.getString("status"), clubId).stream().findFirst();
    }

    public List<Question> lockQuestions(long roundId) {
        return jdbc.query("""
                SELECT id, is_required, max_length FROM application_questions
                WHERE round_id = ? ORDER BY display_order, id FOR SHARE
                """, (rs, row) -> new Question(rs.getLong("id"),
                rs.getBoolean("is_required"), rs.getInt("max_length")), roundId);
    }

    public boolean hasApplication(long roundId, long userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM applications WHERE round_id = ? AND applicant_id = ?)
                """, Boolean.class, roundId, userId));
    }

    public Memberships lockAndReadMemberships(long userId, long clubId, Instant now) {
        // Lock all existing memberships, including inactive ones, before counting.
        // The FOR UPDATE student-profile lock also blocks new membership FK references until commit.
        jdbc.query("SELECT id FROM club_memberships WHERE user_id = ? FOR SHARE",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> {}, userId);
        OffsetDateTime at = now.atOffset(ZoneOffset.UTC);
        return jdbc.queryForObject("""
                SELECT COUNT(DISTINCT club_id) AS total,
                       COUNT(*) FILTER (WHERE club_id = ?) > 0 AS target_member
                FROM club_memberships
                WHERE user_id = ? AND status = 'ACTIVE' AND joined_at <= ? AND ended_at IS NULL
                """, (rs, row) -> new Memberships(rs.getBoolean("target_member"), rs.getLong("total")),
                clubId, userId, at);
    }

    public long insertApplication(long roundId, long clubId, long userId, String motivation, Instant now) {
        OffsetDateTime at = now.atOffset(ZoneOffset.UTC);
        return jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation, status, submitted_at, updated_at, version)
                VALUES (?, ?, ?, ?, 'SUBMITTED', ?, ?, 0) RETURNING id
                """, Long.class, roundId, clubId, userId, motivation, at, at);
    }

    public void insertAnswers(long applicationId, long roundId, List<Answer> answers) {
        for (Answer answer : answers) {
            jdbc.update("""
                    INSERT INTO application_answers (application_id, question_id, round_id, answer_text)
                    VALUES (?, ?, ?, ?)
                    """, applicationId, answer.questionId(), roundId, answer.text());
        }
    }

    public void insertLinks(long applicationId, List<Link> links, Instant now) {
        for (int i = 0; i < links.size(); i++) {
            Link link = links.get(i);
            jdbc.update("""
                    INSERT INTO application_links (application_id, label, url, display_order, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """, applicationId, link.label(), link.url(), i + 1, now.atOffset(ZoneOffset.UTC));
        }
    }

    public void insertInitialHistory(long applicationId, long userId, Instant now) {
        jdbc.update("""
                INSERT INTO application_status_history
                    (application_id, from_status, to_status, actor_id, reason, changed_at)
                VALUES (?, NULL, 'SUBMITTED', ?, NULL, ?)
                """, applicationId, userId, now.atOffset(ZoneOffset.UTC));
    }

    /** Match only the documented duplicate key; never relabel arbitrary integrity failures. */
    public static boolean isRoundApplicantConflict(DuplicateKeyException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && "23505".equals(sql.getSQLState())
                    && sql.getMessage() != null
                    && sql.getMessage().contains("\"uq_applications_round_applicant\"")) return true;
        }
        return false;
    }

    private static Instant instant(OffsetDateTime value) { return value == null ? null : value.toInstant(); }
}
