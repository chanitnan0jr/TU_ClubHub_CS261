package com.tu.clubhub.recruitment.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** JDBC persistence for application questions. Authorization belongs in the service. */
@Repository
public class ApplicationQuestionRepository {

    private final JdbcTemplate jdbcTemplate;

    public ApplicationQuestionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record RoundScope(
            long id,
            long clubId,
            String publicationStatus,
            boolean closed,
            long version) {
    }

    public record Question(
            long id,
            long roundId,
            String questionText,
            boolean isRequired,
            int displayOrder) {
    }

    public Optional<RoundScope> findRoundScope(long roundId) {
        return queryRoundScope(roundId, false);
    }

    /** Must be called within the same service transaction as a question write. */
    public Optional<RoundScope> lockRoundScope(long roundId) {
        return queryRoundScope(roundId, true);
    }

    private Optional<RoundScope> queryRoundScope(long roundId, boolean forUpdate) {
        String sql = """
                SELECT id, club_id, publication_status, closed_at, version
                FROM recruitment_rounds
                WHERE id = ?
                """ + (forUpdate ? " FOR UPDATE" : "");

        return jdbcTemplate.query(sql, (rs, rowNum) -> new RoundScope(
                rs.getLong("id"),
                rs.getLong("club_id"),
                rs.getString("publication_status"),
                rs.getObject("closed_at") != null,
                rs.getLong("version")), roundId).stream().findFirst();
    }

    /** Includes withdrawn/rejected applications for the self-review restriction. */
    public boolean hasApplicationByApplicant(long roundId, long applicantId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM applications
                    WHERE round_id = ? AND applicant_id = ?
                )
                """, Boolean.class, roundId, applicantId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean hasApplications(long roundId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM applications WHERE round_id = ?)
                """, Boolean.class, roundId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean hasAnswers(long roundId, long questionId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM application_answers
                    WHERE round_id = ? AND question_id = ?
                )
                """, Boolean.class, roundId, questionId);
        return Boolean.TRUE.equals(exists);
    }

    public List<Question> findAllByRound(long roundId) {
        return jdbcTemplate.query("""
                SELECT id, round_id, prompt, is_required, display_order
                FROM application_questions
                WHERE round_id = ?
                ORDER BY display_order ASC, id ASC
                """, (rs, rowNum) -> mapQuestion(rs), roundId);
    }

    public Optional<Question> findByIdAndRound(long roundId, long questionId) {
        return jdbcTemplate.query("""
                SELECT id, round_id, prompt, is_required, display_order
                FROM application_questions
                WHERE round_id = ? AND id = ?
                """, (rs, rowNum) -> mapQuestion(rs), roundId, questionId)
                .stream().findFirst();
    }

    private Question mapQuestion(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Question(
                rs.getLong("id"),
                rs.getLong("round_id"),
                rs.getString("prompt"),
                rs.getBoolean("is_required"),
                rs.getInt("display_order"));
    }

    /** Caller must lock the parent round first, within a write transaction. */
    public long insert(long roundId, String questionText, boolean isRequired) {
        Long maxOrder = jdbcTemplate.queryForObject("""
                SELECT COALESCE(MAX(display_order)::bigint, 0::bigint)
                FROM application_questions WHERE round_id = ?
                """, Long.class, roundId);
        long nextOrder = (maxOrder == null ? 0L : maxOrder) + 1;
        if (nextOrder > Integer.MAX_VALUE) {
            throw new IllegalStateException("Question display order exceeds INTEGER range");
        }

        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO application_questions
                    (round_id, prompt, is_required, display_order)
                VALUES (?, ?, ?, ?)
                RETURNING id
                """, Long.class, roundId, questionText, isRequired, (int) nextOrder);
        if (id == null) {
            throw new IllegalStateException("Database did not return the created question ID");
        }
        return id;
    }

    public int update(long roundId, long questionId, String questionText, boolean isRequired) {
        return jdbcTemplate.update("""
                UPDATE application_questions
                SET prompt = ?, is_required = ?
                WHERE round_id = ? AND id = ?
                """, questionText, isRequired, roundId, questionId);
    }

    /** The database FK also prevents deletion if application_answers reference this ID. */
    public int delete(long roundId, long questionId) {
        return jdbcTemplate.update("""
                DELETE FROM application_questions
                WHERE round_id = ? AND id = ?
                """, roundId, questionId);
    }

    /**
     * Assigns a complete new order (1..n). Call only after locking the round,
     * validating permission, and checking the round's editable state.
     *
     * PostgreSQL enforces UNIQUE(round_id, display_order) immediately, so a
     * two-pass move through unused positive positions avoids transient clashes.
     * The surrounding service transaction must roll back both passes on failure.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reorder(long roundId, List<Long> questionIds) {
        List<Question> current = findAllByRound(roundId);
        Set<Long> currentIds = current.stream()
                .map(Question::id)
                .collect(Collectors.toSet());

        if (questionIds == null
                || questionIds.stream().anyMatch(id -> id == null || id <= 0)
                || questionIds.size() != current.size()
                || new HashSet<>(questionIds).size() != questionIds.size()
                || !currentIds.equals(new HashSet<>(questionIds))) {
            throw new IllegalArgumentException(
                    "questionIds must list every question in this round exactly once");
        }
        if (questionIds.isEmpty()) {
            return;
        }

        long maxOrder = current.stream().mapToLong(Question::displayOrder)
                .max().orElse(0L);
        if (maxOrder + questionIds.size() > Integer.MAX_VALUE) {
            throw new IllegalStateException("No safe temporary display-order range");
        }

        for (int i = 0; i < questionIds.size(); i++) {
            updateDisplayOrder(roundId, questionIds.get(i), (int) (maxOrder + i + 1));
        }
        for (int i = 0; i < questionIds.size(); i++) {
            updateDisplayOrder(roundId, questionIds.get(i), i + 1);
        }
    }

    /** Call after a successful delete, from the same write transaction. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void compactDisplayOrder(long roundId) {
        List<Long> remainingIds = findAllByRound(roundId).stream()
                .map(Question::id).toList();
        reorder(roundId, remainingIds);
    }

    private void updateDisplayOrder(long roundId, long questionId, int displayOrder) {
        int count = jdbcTemplate.update("""
                UPDATE application_questions SET display_order = ?
                WHERE round_id = ? AND id = ?
                """, displayOrder, roundId, questionId);
        if (count != 1) {
            throw new IllegalStateException("Question set changed during reorder");
        }
    }

    /** Increment parent version so stale round replacements cannot discard edits. */
    public int bumpRoundVersion(long roundId, Instant now) {
        return jdbcTemplate.update("""
                UPDATE recruitment_rounds
                SET version = version + 1, updated_at = ?
                WHERE id = ?
                """, OffsetDateTime.ofInstant(now, ZoneOffset.UTC), roundId);
    }
}
