package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_test}",
        "spring.datasource.username=postgres",
        "spring.datasource.password=${DB_PASSWORD}",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.session.jdbc.initialize-schema=never",
        "tu.auth.mode=mock"
})
@ActiveProfiles("test")
@Transactional
class ApplicationQuestionIntegrityIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ApplicationQuestionService service;

    @Autowired
    private ApplicationQuestionRepository repository;

    @Autowired
    private Clock clock;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reorderPersistsContinuousOrderAndPreservesQuestionContent() {
        Fixture f = fixture();
        long first = question(f.roundId(), "First", true);
        long second = question(f.roundId(), "Second", false);
        long third = question(f.roundId(), "Third", true);

        long versionBefore = version(f.roundId());

        var result = service.reorderQuestions(
                f.roundId(), List.of(third, first, second));

        assertEquals(
                List.of(
                        Long.toString(third),
                        Long.toString(first),
                        Long.toString(second)),
                result.items().stream()
                        .map(ApplicationQuestionService.QuestionView::id)
                        .toList());

        // Read again from PostgreSQL, rather than checking only the response.
        var stored = repository.findAllByRound(f.roundId());

        assertEquals(
                List.of(third, first, second),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::id)
                        .toList());

        assertEquals(
                List.of(1, 2, 3),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::displayOrder)
                        .toList());

        assertEquals(
                List.of("Third", "First", "Second"),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::questionText)
                        .toList());

        assertEquals(
                List.of(true, true, false),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::isRequired)
                        .toList());

        assertEquals(versionBefore + 1, version(f.roundId()));
    }

    @Test
    void deletingMiddleQuestionCompactsOrderAndNextQuestionAppends() {
        Fixture f = fixture();
        long first = question(f.roundId(), "First", true);
        long second = question(f.roundId(), "Second", false);
        long third = question(f.roundId(), "Third", true);

        long versionBefore = version(f.roundId());

        service.deleteQuestion(f.roundId(), second);

        assertTrue(
                repository.findByIdAndRound(f.roundId(), second).isEmpty());

        var remaining = repository.findAllByRound(f.roundId());

        assertEquals(
                List.of(first, third),
                remaining.stream()
                        .map(ApplicationQuestionRepository.Question::id)
                        .toList());

        assertEquals(
                List.of(1, 2),
                remaining.stream()
                        .map(ApplicationQuestionRepository.Question::displayOrder)
                        .toList());

        assertEquals(versionBefore + 1, version(f.roundId()));

        long fourth = question(f.roundId(), "Fourth", false);

        var stored = repository.findAllByRound(f.roundId());

        assertEquals(
                List.of(first, third, fourth),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::id)
                        .toList());

        assertEquals(
                List.of(1, 2, 3),
                stored.stream()
                        .map(ApplicationQuestionRepository.Question::displayOrder)
                        .toList());

        assertEquals(versionBefore + 2, version(f.roundId()));
    }

    @Test
    void invalidReorderListsLeaveQuestionsAndRoundUnchanged() {
        Fixture f = fixture();
        long first = question(f.roundId(), "First", true);
        long second = question(f.roundId(), "Second", false);

        long otherRound = createRound(f.clubId(), f.userId());
        long otherQuestion = question(otherRound, "Other round", true);

        var questionsBefore = questionRows(f.roundId());
        var roundBefore = roundRow(f.roundId());
        var otherQuestionsBefore = questionRows(otherRound);
        var otherRoundBefore = roundRow(otherRound);

        // Duplicate ID.
        assertStatus(400, () -> service.reorderQuestions(
                f.roundId(), List.of(first, first)));

        // Missing a question.
        assertStatus(400, () -> service.reorderQuestions(
                f.roundId(), List.of(first)));

        // An ID belonging to another round.
        assertStatus(400, () -> service.reorderQuestions(
                f.roundId(), List.of(first, otherQuestion)));

        assertEquals(questionsBefore, questionRows(f.roundId()));
        assertEquals(roundBefore, roundRow(f.roundId()));
        assertEquals(otherQuestionsBefore, questionRows(otherRound));
        assertEquals(otherRoundBefore, roundRow(otherRound));

        assertTrue(repository.findByIdAndRound(
                f.roundId(), second).isPresent());
    }

    @Test
    void existingApplicationProtectsQuestionsAnswersAndApplicationData() {
        Fixture f = fixture();
        long answered = question(f.roundId(), "Answered question", true);
        long unanswered = question(f.roundId(), "Unanswered question", false);

        long student = createUser("applicant");

        jdbc.update("""
                INSERT INTO student_profiles
                    (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, student, studentCode());

        Long application = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation)
                VALUES (?, ?, ?, 'Original motivation')
                RETURNING id
                """, Long.class, f.roundId(), f.clubId(), student);

        jdbc.update("""
                INSERT INTO application_answers
                    (application_id, question_id, round_id, answer_text)
                VALUES (?, ?, ?, 'Original answer')
                """, application, answered, f.roundId());

        jdbc.update("""
                INSERT INTO application_status_history
                    (application_id, from_status, to_status, actor_id)
                VALUES (?, NULL, 'SUBMITTED', ?)
                """, application, student);

        var questionsBefore = questionRows(f.roundId());
        var roundBefore = roundRow(f.roundId());
        var applicationBefore = jdbc.queryForMap(
                "SELECT * FROM applications WHERE id = ?", application);
        var answersBefore = jdbc.queryForList("""
                SELECT * FROM application_answers
                WHERE application_id = ? ORDER BY id
                """, application);
        var historyBefore = jdbc.queryForList("""
                SELECT * FROM application_status_history
                WHERE application_id = ? ORDER BY id
                """, application);

        assertStatus(409, () -> service.createQuestion(
                f.roundId(), "New question", true));

        assertStatus(409, () -> service.updateQuestion(
                f.roundId(), answered, "Changed question", false));

        // Both answered and unanswered questions must be protected.
        assertStatus(409, () -> service.deleteQuestion(
                f.roundId(), answered));

        assertStatus(409, () -> service.deleteQuestion(
                f.roundId(), unanswered));

        assertStatus(409, () -> service.reorderQuestions(
                f.roundId(), List.of(unanswered, answered)));

        assertEquals(questionsBefore, questionRows(f.roundId()));
        assertEquals(roundBefore, roundRow(f.roundId()));

        assertEquals(applicationBefore, jdbc.queryForMap(
                "SELECT * FROM applications WHERE id = ?", application));

        assertEquals(answersBefore, jdbc.queryForList("""
                SELECT * FROM application_answers
                WHERE application_id = ? ORDER BY id
                """, application));

        assertEquals(historyBefore, jdbc.queryForList("""
                SELECT * FROM application_status_history
                WHERE application_id = ? ORDER BY id
                """, application));
    }

    private long question(long roundId, String text, boolean required) {
        return Long.parseLong(
                service.createQuestion(roundId, text, required).id());
    }

    private long version(long roundId) {
        return jdbc.queryForObject("""
                SELECT version FROM recruitment_rounds WHERE id = ?
                """, Long.class, roundId);
    }

    private List<java.util.Map<String, Object>> questionRows(long roundId) {
        return jdbc.queryForList("""
                SELECT * FROM application_questions
                WHERE round_id = ? ORDER BY id
                """, roundId);
    }

    private java.util.Map<String, Object> roundRow(long roundId) {
        return jdbc.queryForMap("""
                SELECT * FROM recruitment_rounds WHERE id = ?
                """, roundId);
    }

    private void assertStatus(int status, Runnable action) {
        var error = assertThrows(
                ResponseStatusException.class, action::run);
        assertEquals(status, error.getStatusCode().value());
    }

    private Fixture fixture() {
        String suffix = UUID.randomUUID().toString();
        String username = "committee-" + suffix;
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        Long userId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test committee')
                RETURNING id
                """, Long.class, username);

        jdbc.update("""
                INSERT INTO student_profiles
                    (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, userId, studentCode());

        Long categoryId = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, "category-" + suffix);

        Long clubId = jdbc.queryForObject("""
                INSERT INTO clubs
                    (category_id, name, description, created_by)
                VALUES (?, ?, 'Test club', ?)
                RETURNING id
                """, Long.class, categoryId, "club-" + suffix, userId);

        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships
                    (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?)
                RETURNING id
                """, Long.class, clubId, userId, now.minusDays(1));

        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role,
                     starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?)
                """, membershipId, now.minusDays(1),
                now.plusDays(1), userId);

        var principal = new ClubHubPrincipal(userId, username, "USER");
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, List.of()));
        SecurityContextHolder.setContext(context);

        return new Fixture(
                clubId, userId, createRound(clubId, userId));
    }

    private long createRound(long clubId, long userId) {
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status, created_by)
                VALUES (?, 'Question integrity test', 2569, 1,
                        'Description', ?, ?, ?, 'DRAFT', ?)
                RETURNING id
                """, Long.class, clubId,
                now.plusHours(1), now.plusHours(2),
                now.plusDays(1), userId);
    }

    private long createUser(String prefix) {
        return jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test user') RETURNING id
                """, Long.class, prefix + "-" + UUID.randomUUID());
    }

    private String studentCode() {
        return "T-" + UUID.randomUUID().toString()
                .replace("-", "").substring(0, 16);
    }

    private record Fixture(long clubId, long userId, long roundId) {
    }
}