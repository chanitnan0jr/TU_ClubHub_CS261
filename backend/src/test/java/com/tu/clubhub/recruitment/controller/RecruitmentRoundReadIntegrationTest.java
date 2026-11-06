package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Committee reads of recruitment rounds (listRounds/getRound in rounds.openapi.yaml) through
 * the real filter chain, guard and SQL against the disposable PostgreSQL test database.
 */
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
class RecruitmentRoundReadIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Clock clock;

    private OffsetDateTime now;
    private Long categoryId;

    @BeforeEach
    void setUp() {
        now = clock.instant().atOffset(ZoneOffset.UTC);
        categoryId = jdbc.queryForObject(
                "INSERT INTO club_categories (name) VALUES (?) RETURNING id",
                Long.class, "round-read-category-" + UUID.randomUUID());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void committeeListsEveryStateNewestFirstWithQuestions() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long draft = createRound(clubId, committee, "DRAFT", now.minusHours(3));
        Long published = createRound(clubId, committee, "PUBLISHED", now.minusHours(2));
        Long cancelled = createRound(clubId, committee, "CANCELLED", now.minusHours(1));
        addQuestion(draft, "Why join?", 2);
        addQuestion(draft, "What can you do?", 1);
        createRound(createClubManagedBy(createStudent()), committee, "DRAFT", now);

        as(committee, get(listPath(clubId)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.items[*].id").value(contains(
                        cancelled.toString(), published.toString(), draft.toString())))
                .andExpect(jsonPath("$.items[*].publicationStatus").value(contains(
                        "CANCELLED", "PUBLISHED", "DRAFT")))
                .andExpect(jsonPath("$.items[0].clubId").value(clubId.toString()))
                .andExpect(jsonPath("$.items[0].questions", hasSize(0)))
                .andExpect(jsonPath("$.items[2].questions[*].prompt").value(contains(
                        "What can you do?", "Why join?")))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void filtersByPublicationStatus() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long draft = createRound(clubId, committee, "DRAFT", now.minusHours(2));
        createRound(clubId, committee, "PUBLISHED", now.minusHours(1));

        as(committee, get(listPath(clubId)).queryParam("publicationStatus", "DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(draft.toString())))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void pagesInStableOrderWithTotals() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        // Same createdAt: id DESC breaks the tie.
        Long first = createRound(clubId, committee, "DRAFT", now);
        Long second = createRound(clubId, committee, "DRAFT", now);
        Long third = createRound(clubId, committee, "DRAFT", now);

        as(committee, get(listPath(clubId)).queryParam("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(third.toString(), second.toString())))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));

        as(committee, get(listPath(clubId)).queryParam("page", "1").queryParam("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(first.toString())))
                .andExpect(jsonPath("$.page").value(1));

        as(committee, get(listPath(clubId)).queryParam("page", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void roundTheCallerAppliedToIsHiddenFromListAndForbiddenToRead() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long applied = createRound(clubId, committee, "PUBLISHED", now.minusHours(2));
        Long other = createRound(clubId, committee, "DRAFT", now.minusHours(1));
        apply(applied, clubId, committee, "WITHDRAWN");

        as(committee, get(listPath(clubId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(other.toString())))
                .andExpect(jsonPath("$.totalElements").value(1));

        as(committee, get(roundPath(clubId, applied)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        Long colleague = createStudent();
        assignCommittee(clubId, colleague);
        as(colleague, get(listPath(clubId)))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void committeeReadsDraftRoundWithQuestions() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long roundId = createRound(clubId, committee, "DRAFT", now);
        addQuestion(roundId, "Why join?", 1);

        as(committee, get(roundPath(clubId, roundId)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.id").value(roundId.toString()))
                .andExpect(jsonPath("$.clubId").value(clubId.toString()))
                .andExpect(jsonPath("$.title").value("Round DRAFT"))
                .andExpect(jsonPath("$.publicationStatus").value("DRAFT"))
                .andExpect(jsonPath("$.version").value(0))
                .andExpect(jsonPath("$.eligibilityText").value(nullValue()))
                .andExpect(jsonPath("$.publishedAt").value(nullValue()))
                .andExpect(jsonPath("$.questions[0].prompt").value("Why join?"))
                .andExpect(jsonPath("$.questions[0].required").value(true))
                .andExpect(jsonPath("$.questions[0].displayOrder").value(1))
                .andExpect(jsonPath("$.createdBy").doesNotExist());
    }

    @Test
    void roundOfAnotherClubOrMissingRoundIsNotFound() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long otherClub = createClubManagedBy(createStudent());
        Long foreignRound = createRound(otherClub, committee, "DRAFT", now);

        as(committee, get(roundPath(clubId, foreignRound)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

        as(committee, get(roundPath(clubId, Long.MAX_VALUE)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void callerWithoutCommitteeRightsIsForbidden() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long roundId = createRound(clubId, committee, "DRAFT", now);
        Long outsider = createStudent();

        as(outsider, get(listPath(clubId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        as(outsider, get(roundPath(clubId, roundId)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        // Authorization comes before the club lookup, as for the round writes.
        as(committee, get(listPath(Long.MAX_VALUE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void unauthenticatedRequestIsUnauthorized() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);
        Long roundId = createRound(clubId, committee, "DRAFT", now);

        mvc.perform(get(listPath(clubId)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        mvc.perform(get(roundPath(clubId, roundId)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void invalidIdsAndQueryParametersAreRejected() throws Exception {
        Long committee = createStudent();
        Long clubId = createClubManagedBy(committee);

        for (String path : List.of("/api/v1/clubs/0/rounds", "/api/v1/clubs/abc/rounds",
                "/api/v1/clubs/" + clubId + "/rounds/0", "/api/v1/clubs/" + clubId + "/rounds/abc")) {
            as(committee, get(path))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));
        }

        for (String[] query : List.of(
                new String[] {"page", "-1"}, new String[] {"page", "x"},
                new String[] {"size", "0"}, new String[] {"size", "101"},
                new String[] {"publicationStatus", "OPEN"}, new String[] {"publicationStatus", "draft"})) {
            as(committee, get(listPath(clubId)).queryParam(query[0], query[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.fieldErrors[0].field").value(query[0]));
        }
    }

    private ResultActions as(Long userId, MockHttpServletRequestBuilder request) throws Exception {
        var principal = new ClubHubPrincipal(userId, "round-read-" + userId, "USER");
        return mvc.perform(request.with(authentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()))));
    }

    private static String listPath(Long clubId) {
        return "/api/v1/clubs/" + clubId + "/rounds";
    }

    private static String roundPath(Long clubId, Long roundId) {
        return listPath(clubId) + "/" + roundId;
    }

    private Long createStudent() {
        String suffix = UUID.randomUUID().toString();
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name)
                VALUES (?, 'Round read test user') RETURNING id
                """, Long.class, "round-read-" + suffix);
        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, userId, "RR-" + suffix.replace("-", "").substring(0, 16));
        return userId;
    }

    private Long createClubManagedBy(Long userId) {
        Long clubId = jdbc.queryForObject("""
                INSERT INTO clubs (category_id, name, description, status, created_by)
                VALUES (?, ?, 'Round read test club', 'ACTIVE', ?) RETURNING id
                """, Long.class, categoryId, "round-read-club-" + UUID.randomUUID(), userId);
        assignCommittee(clubId, userId);
        return clubId;
    }

    private void assignCommittee(Long clubId, Long userId) {
        Long membershipId = jdbc.queryForObject("""
                INSERT INTO club_memberships (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?) RETURNING id
                """, Long.class, clubId, userId, now.minusDays(1));
        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', ?, ?, ?)
                """, membershipId, now.minusDays(1), now.plusDays(1), userId);
    }

    private Long createRound(Long clubId, Long createdBy, String status, OffsetDateTime createdAt) {
        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description,
                     opens_at, closes_at, confirmation_deadline,
                     publication_status, published_at, created_by, created_at, updated_at)
                VALUES (?, ?, 2569, 1, 'Description', ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class, clubId, "Round " + status,
                now.minusHours(1), now.plusDays(1), now.plusDays(2), status,
                "PUBLISHED".equals(status) ? now.minusHours(2) : null,
                createdBy, createdAt, createdAt);
    }

    private void addQuestion(Long roundId, String prompt, int displayOrder) {
        jdbc.update("""
                INSERT INTO application_questions (round_id, prompt, is_required, display_order)
                VALUES (?, ?, TRUE, ?)
                """, roundId, prompt, displayOrder);
    }

    private void apply(Long roundId, Long clubId, Long applicantId, String status) {
        jdbc.update("""
                INSERT INTO applications (round_id, club_id, applicant_id, motivation, status)
                VALUES (?, ?, ?, 'Applied as a committee member', ?)
                """, roundId, clubId, applicantId, status);
    }
}
