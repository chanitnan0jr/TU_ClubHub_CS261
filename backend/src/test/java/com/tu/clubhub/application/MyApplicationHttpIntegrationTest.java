package com.tu.clubhub.application;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MyApplicationHttpIntegrationTest {

    private static final String PATH = "/api/v1/me/applications";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Clock clock;

    @Test
    void anonymousRequestsRequireLogin() throws Exception {
        mvc.perform(get(PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));

        mvc.perform(get(PATH + "/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listReturnsOnlySessionUsersApplications() throws Exception {
        Fixture f = fixture(false);

        mvc.perform(get(PATH)
                        .with(authentication(auth(f.ownerId()))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id")
                        .value(Long.toString(f.applicationId())))
                .andExpect(jsonPath("$.items[0].applicantVisibleStatus")
                        .value("SUBMITTED"))
                .andExpect(jsonPath("$.items[0].status").doesNotExist())
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));

        mvc.perform(get(PATH)
                        .with(authentication(auth(f.otherId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id")
                        .value(Long.toString(f.otherApplicationId())));
    }

    @Test
    void unpublishedDetailHidesResultAndInternalReviewHistory()
            throws Exception {

        Fixture f = fixture(false);

        mvc.perform(get(PATH + "/" + f.applicationId())
                        .with(authentication(auth(f.ownerId()))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.applicantVisibleStatus")
                        .value("SUBMITTED"))
                .andExpect(jsonPath("$.displayStatusLabel")
                        .value("รอพิจารณา"))
                .andExpect(jsonPath("$.resultMessage").value(
                        org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.round.resultsPublishedAt").value(
                        org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.canConfirm").value(false))
                .andExpect(jsonPath("$.canDecline").value(false))
                .andExpect(jsonPath("$.statusHistory.length()").value(1))
                .andExpect(jsonPath("$.statusHistory[0].status")
                        .value("SUBMITTED"))
                .andExpect(jsonPath("$.decidedAt").doesNotExist())
                .andExpect(jsonPath("$.decidedBy").doesNotExist())
                .andExpect(jsonPath("$.reviews").doesNotExist())
                .andExpect(content().string(
                        not(containsString("SECRET_INTERNAL_COMMENT"))))
                .andExpect(content().string(
                        not(containsString("SECRET_INTERNAL_REASON"))))
                .andExpect(content().string(
                        not(containsString("Published result message"))));
    }

    @Test
    void publishedDetailReturnsOrderedAnswersLinksAndSafeTimeline()
            throws Exception {

        Fixture f = fixture(true);

        mvc.perform(get(PATH + "/" + f.applicationId())
                        .with(authentication(auth(f.ownerId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id")
                        .value(Long.toString(f.applicationId())))
                .andExpect(jsonPath("$.motivation")
                        .value("Owner motivation"))
                .andExpect(jsonPath("$.applicantVisibleStatus")
                        .value("ACCEPTED_PENDING_CONFIRMATION"))
                .andExpect(jsonPath("$.resultMessage")
                        .value("Published result message"))
                .andExpect(jsonPath("$.canConfirm").value(true))
                .andExpect(jsonPath("$.canDecline").value(true))
                .andExpect(jsonPath("$.questionsWithAnswers.length()")
                        .value(2))
                .andExpect(jsonPath("$.questionsWithAnswers[0].questionText")
                        .value("First question"))
                .andExpect(jsonPath("$.questionsWithAnswers[0].answerText")
                        .value("Owner answer"))
                .andExpect(jsonPath("$.questionsWithAnswers[1].questionText")
                        .value("Optional question"))
                .andExpect(jsonPath("$.questionsWithAnswers[1].answerText")
                        .value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.links[0].label").value("First link"))
                .andExpect(jsonPath("$.links[1].label").value("Second link"))
                .andExpect(jsonPath("$.statusHistory.length()").value(2))
                .andExpect(jsonPath("$.statusHistory[0].status")
                        .value("SUBMITTED"))
                .andExpect(jsonPath("$.statusHistory[1].status")
                        .value("ACCEPTED_PENDING_CONFIRMATION"))
                .andExpect(content().string(
                        not(containsString("SECRET_INTERNAL_COMMENT"))))
                .andExpect(content().string(
                        not(containsString("SECRET_INTERNAL_REASON"))));
    }

    @Test
    void foreignApplicationIsForbiddenAndMissingApplicationIsNotFound()
            throws Exception {

        Fixture f = fixture(true);

        mvc.perform(get(PATH + "/" + f.applicationId())
                        .with(authentication(auth(f.otherId()))))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().string(
                        not(containsString("Owner motivation"))))
                .andExpect(content().string(
                        not(containsString("Owner answer"))));

        mvc.perform(get(PATH + "/9223372036854775807")
                        .with(authentication(auth(f.ownerId()))))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidIdAndPaginationReturnStandardErrors() throws Exception {
        Fixture f = fixture(false);

        for (String id : List.of(
                "abc", "0", "-1", "9223372036854775808")) {

            mvc.perform(get(PATH + "/" + id)
                            .with(authentication(auth(f.ownerId()))))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(
                            MediaType.APPLICATION_PROBLEM_JSON));
        }

        for (String query : List.of(
                "?page=-1", "?size=0", "?size=101", "?page=abc")) {

            mvc.perform(get(PATH + query)
                            .with(authentication(auth(f.ownerId()))))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(
                            MediaType.APPLICATION_PROBLEM_JSON));
        }
    }

    @Test
    void inactiveStudentAndClubDoNotPreventReadingHistory()
            throws Exception {

        Fixture f = fixture(true);

        jdbc.update("""
                UPDATE student_profiles
                SET student_status = 'INACTIVE'
                WHERE user_id = ?
                """, f.ownerId());

        jdbc.update("""
                UPDATE clubs SET status = 'INACTIVE' WHERE id = ?
                """, f.clubId());

        mvc.perform(get(PATH + "/" + f.applicationId())
                        .with(authentication(auth(f.ownerId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canConfirm").value(false))
                .andExpect(jsonPath("$.canDecline").value(true));
    }

    private UsernamePasswordAuthenticationToken auth(long userId) {
        return UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(
                        userId, "test-user-" + userId, "USER"),
                null,
                List.of());
    }

    private Fixture fixture(boolean published) {
        String suffix = UUID.randomUUID().toString();
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        long owner = student("owner");
        long other = student("other");

        Long category = jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, "category-" + suffix);

        Long club = jdbc.queryForObject("""
                INSERT INTO clubs
                    (category_id, name, description, created_by)
                VALUES (?, ?, 'Test description', ?)
                RETURNING id
                """, Long.class, category, "club-" + suffix, owner);

        Long round = jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status,
                     published_at, results_published_at, created_by)
                VALUES (?, 'Test round', 2569, 1,
                        'Description', ?, ?, ?, 'PUBLISHED', ?, ?, ?)
                RETURNING id
                """, Long.class, club,
                now.minusDays(3),
                now.minusDays(1),
                now.plusDays(2),
                now.minusDays(4),
                published ? now.minusHours(1) : null,
                owner);

        Long application = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation,
                     status, submitted_at, decided_by, decided_at,
                     result_message)
                VALUES (?, ?, ?, 'Owner motivation',
                        'ACCEPTED', ?, ?, ?, 'Published result message')
                RETURNING id
                """, Long.class, round, club, owner,
                now.minusDays(2), other, now.minusHours(2));

        Long otherApplication = jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation)
                VALUES (?, ?, ?, 'Other motivation')
                RETURNING id
                """, Long.class, round, club, other);

        // Insert in reverse order to verify ORDER BY, not insertion order.
        jdbc.update("""
                INSERT INTO application_questions
                    (round_id, prompt, is_required, display_order)
                VALUES (?, 'Optional question', false, 2)
                """, round);

        Long question = jdbc.queryForObject("""
                INSERT INTO application_questions
                    (round_id, prompt, is_required, display_order)
                VALUES (?, 'First question', true, 1)
                RETURNING id
                """, Long.class, round);

        jdbc.update("""
                INSERT INTO application_answers
                    (application_id, question_id, round_id, answer_text)
                VALUES (?, ?, ?, 'Owner answer')
                """, application, question, round);

        jdbc.update("""
                INSERT INTO application_links
                    (application_id, label, url, display_order)
                VALUES (?, 'Second link', 'https://example.com/second', 2)
                """, application);

        jdbc.update("""
                INSERT INTO application_links
                    (application_id, label, url, display_order)
                VALUES (?, 'First link', 'https://example.com/first', 1)
                """, application);

        jdbc.update("""
                INSERT INTO application_status_history
                    (application_id, from_status, to_status,
                     actor_id, changed_at)
                VALUES (?, NULL, 'SUBMITTED', ?, ?)
                """, application, owner, now.minusDays(2));

        jdbc.update("""
                INSERT INTO application_status_history
                    (application_id, from_status, to_status,
                     actor_id, reason, changed_at)
                VALUES (?, 'SUBMITTED', 'ACCEPTED', ?,
                        'SECRET_INTERNAL_REASON', ?)
                """, application, other, now.minusHours(2));

        jdbc.update("""
                INSERT INTO application_reviews
                    (application_id, reviewer_id,
                     recommendation, internal_comment)
                VALUES (?, ?, 'ACCEPT', 'SECRET_INTERNAL_COMMENT')
                """, application, other);

        return new Fixture(
                owner, other, club, application, otherApplication);
    }

    private long student(String prefix) {
        String suffix = UUID.randomUUID().toString();

        Long id = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Test student') RETURNING id
                """, Long.class, prefix + "-" + suffix);

        jdbc.update("""
                INSERT INTO student_profiles
                    (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, id, "T-" + suffix.replace("-", "").substring(0, 16));

        return id;
    }

    private record Fixture(
            long ownerId,
            long otherId,
            long clubId,
            long applicationId,
            long otherApplicationId) {
    }
}