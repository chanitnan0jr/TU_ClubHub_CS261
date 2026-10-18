package com.tu.clubhub.club.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import com.tu.clubhub.config.AbsoluteSessionTimeoutFilter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Real PostgreSQL, service, repository and HTTP serialization, with security filters enabled. */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles({"test", "seedtest"})
@Import(PublicClubControllerIntegrationTest.FixedClockConfiguration.class)
@Transactional
class PublicClubControllerIntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private SessionRepository<?> sessionRepository;

    private Long userId;
    private Long categoryId;
    private Long activeClubId;
    private Long otherClubId;
    private Long inactiveClubId;
    private Long tagId;
    private String activeClubName;
    private String categoryName;
    private String tagName;

    @BeforeEach
    void insertFixtures() {
        // All fixtures participate in the test transaction and are rolled back after each test.
        String suffix = UUID.randomUUID().toString();
        userId = jdbc.queryForObject(
                "INSERT INTO users (tu_username, display_name, email) VALUES (?, ?, ?) RETURNING id",
                Long.class, "task37-" + suffix, "Test operator", "operator@example.org");
        categoryName = "Public category " + suffix;
        categoryId = jdbc.queryForObject(
                "INSERT INTO club_categories (name, description) VALUES (?, ?) RETURNING id",
                Long.class, categoryName, "Not part of the public category summary");
        activeClubName = "Public A " + suffix;
        activeClubId = insertClub(activeClubName, "ACTIVE");
        otherClubId = insertClub("Public B " + suffix, "ACTIVE");
        inactiveClubId = insertClub("Inactive " + suffix, "INACTIVE");
        tagName = "Programming " + suffix;
        tagId = jdbc.queryForObject(
                "INSERT INTO tags (name) VALUES (?) RETURNING id", Long.class, tagName);
        jdbc.update("INSERT INTO club_tags (club_id, tag_id) VALUES (?, ?)", activeClubId, tagId);
    }

    @Test
    void anonymousCanReadActiveClubAndOnlyPublicFieldsAreSerialized() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs/{id}", activeClubId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.keys()", containsInAnyOrder(
                        "id", "name", "description", "objectives", "contactUrl",
                        "facebookUrl", "instagramUrl", "contactEmail", "affiliationLevel",
                        "affiliationName", "imageUrl", "bannerUrl", "category", "tags")))
                .andExpect(jsonPath("$.id").value(activeClubId.toString()))
                .andExpect(jsonPath("$.name").value(activeClubName))
                .andExpect(jsonPath("$.description").value("Public club description"))
                .andExpect(jsonPath("$.objectives").value("Learn together"))
                .andExpect(jsonPath("$.contactUrl").value("https://example.org/contact"))
                .andExpect(jsonPath("$.contactEmail").value("club@example.org"))
                .andExpect(jsonPath("$.affiliationLevel").value("University"))
                .andExpect(jsonPath("$.affiliationName").value("Thammasat University"))
                .andExpect(jsonPath("$.imageUrl").value("https://example.org/logo.png"))
                .andExpect(jsonPath("$.facebookUrl").value(nullValue()))
                .andExpect(jsonPath("$.instagramUrl").value(nullValue()))
                .andExpect(jsonPath("$.bannerUrl").value(nullValue()))
                .andExpect(jsonPath("$.category.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.category.name").value(categoryName))
                .andExpect(jsonPath("$.category.keys()", containsInAnyOrder("id", "name")))
                .andExpect(jsonPath("$.tags[*].id", contains(tagId.toString())))
                .andExpect(jsonPath("$.tags[0].name").value(tagName))
                .andExpect(jsonPath("$.tags[0].keys()", containsInAnyOrder("id", "name")));
    }

    @Test
    void anonymousRecruitmentResponseIncludesPublishedButExcludesDraft() throws Exception {
        Instant opensAt = NOW.minusSeconds(60);
        Instant closesAt = NOW.plusSeconds(60);
        Long publishedId = insertRound(activeClubId, "Public recruitment", "PUBLISHED", opensAt, closesAt, null);
        Long draftId = insertRound(activeClubId, "Unpublished draft", "DRAFT", opensAt, closesAt, null);

        // This request uses the real service and SQL query. No cookie or security test user is sent.
        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.keys()", containsInAnyOrder("items", "page")))
                .andExpect(jsonPath("$.items[*].id", contains(publishedId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(draftId.toString()))))
                .andExpect(jsonPath("$.items[0].name").value("Public recruitment"))
                .andExpect(jsonPath("$.items[0].keys()",
                        containsInAnyOrder("id", "name", "opensAt", "closesAt")))
                .andExpect(jsonPath("$.items[0].opensAt").value(opensAt.toString()))
                .andExpect(jsonPath("$.items[0].closesAt").value(closesAt.toString()))
                .andExpect(jsonPath("$.page.keys()",
                        containsInAnyOrder("number", "size", "totalElements", "totalPages")))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void recruitmentResponseExcludesUnavailableAndOtherClubRounds() throws Exception {
        Long eligibleId = insertRound(activeClubId, "Eligible round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        insertRound(activeClubId, "Future round", "PUBLISHED", NOW.plusSeconds(1), NOW.plusSeconds(60), null);
        insertRound(activeClubId, "Past round", "PUBLISHED", NOW.minusSeconds(120), NOW.minusSeconds(1), null);
        insertRound(activeClubId, "Manually closed round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), NOW.minusSeconds(1));
        insertRound(activeClubId, "Cancelled round", "CANCELLED", NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        Long otherClubRoundId = insertRound(otherClubId, "Other club round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);

        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(eligibleId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(otherClubRoundId.toString()))))
                .andExpect(jsonPath("$.items[0].name").value("Eligible round"))
                .andExpect(jsonPath("$.page.totalElements").value(1));

        getRounds(otherClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(otherClubRoundId.toString())))
                .andExpect(jsonPath("$.items[0].name").value("Other club round"));
    }

    @Test
    void multipleTagsAndMixedRoundsAreFilteredBeforeStablePagination() throws Exception {
        Long secondTag = insertTag("Second tag " + UUID.randomUUID());
        Long thirdTag = insertTag("Third tag " + UUID.randomUUID());
        mockMvc.perform(get("/api/v1/public/clubs/{id}", activeClubId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags[*].id", contains(
                        tagId.toString(), secondTag.toString(), thirdTag.toString())));

        List<String> expectedIds = new ArrayList<>();
        for (int number = 0; number < 5; number++) {
            Long id = insertRound(activeClubId, "Published " + number, "PUBLISHED",
                    NOW.minusSeconds(60), NOW.plusSeconds(60), null);
            expectedIds.add(id.toString());
            // Identical opening times and interleaved Draft IDs exercise the ID sort tiebreaker.
            insertRound(activeClubId, "Draft " + number, "DRAFT",
                    NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        }

        List<String> allIds = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = getRounds(activeClubId, page, 2)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.page.number").value(page))
                    .andExpect(jsonPath("$.page.size").value(2))
                    .andExpect(jsonPath("$.page.totalElements").value(5))
                    .andExpect(jsonPath("$.page.totalPages").value(3))
                    .andReturn().getResponse().getContentAsString();
            List<String> pageIds = JsonPath.read(body, "$.items[*].id");
            assertEquals(expectedIds.subList(page * 2, Math.min(page * 2 + 2, 5)), pageIds);
            allIds.addAll(pageIds);
        }
        assertEquals(expectedIds, allIds, "Every published ID appears in stable order across pages");
        assertEquals(expectedIds.size(), new HashSet<>(allIds).size(), "Pages must not repeat IDs");
    }

    @Test
    void closedDraftDoesNotAffectOpenPublishedRounds() throws Exception {
        Long publishedId = insertRound(activeClubId, "Open published", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        Long closedDraftId = insertRound(activeClubId, "Closed former published", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), NOW.minusSeconds(1));
        // closed_at requires a non-null published_at even when the current status is Draft.
        assertEquals(1, jdbc.update(
                "UPDATE recruitment_rounds SET publication_status = 'DRAFT' WHERE id = ?", closedDraftId));

        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(publishedId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(closedDraftId.toString()))))
                .andExpect(jsonPath("$.items[0].name").value("Open published"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void nullableProfileFieldsAndEmptyTagsFollowContract() throws Exception {
        jdbc.update("""
                UPDATE clubs SET objectives = NULL, contact_url = NULL, facebook_url = NULL,
                    instagram_url = NULL, contact_email = NULL, affiliation_level = NULL,
                    affiliation_name = NULL, image_url = NULL, banner_url = NULL
                WHERE id = ?
                """, activeClubId);
        jdbc.update("DELETE FROM club_tags WHERE club_id = ?", activeClubId);
        // category_id/name are mandatory; the category description can be null.
        jdbc.update("UPDATE club_categories SET description = NULL WHERE id = ?", categoryId);

        ResultActions response = mockMvc.perform(get("/api/v1/public/clubs/{id}", activeClubId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeClubId.toString()))
                .andExpect(jsonPath("$.name").value(activeClubName))
                .andExpect(jsonPath("$.category.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.category.name").value(categoryName))
                .andExpect(jsonPath("$.tags").isEmpty());
        for (String field : List.of("objectives", "contactUrl", "facebookUrl", "instagramUrl",
                "contactEmail", "affiliationLevel", "affiliationName", "imageUrl", "bannerUrl")) {
            response.andExpect(jsonPath("$." + field).value(nullValue()));
        }
    }

    @Test
    void unicodeAndMultilineProfileTextIsPreservedInJson() throws Exception {
        String name = "ชมรมทดสอบดนตรี 🎵 " + activeClubId;
        String description = "บรรทัดแรก: ยินดีต้อนรับ 🎉\nบรรทัดที่สอง: มาเล่นดนตรีด้วยกัน";
        String objectives = "เรียนรู้ร่วมกัน 🤝\nสร้างสรรค์ผลงาน";
        jdbc.update("UPDATE clubs SET name = ?, description = ?, objectives = ? WHERE id = ?",
                name, description, objectives, activeClubId);

        mockMvc.perform(get("/api/v1/public/clubs/{id}", activeClubId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(activeClubId.toString()))
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.description").value(description))
                .andExpect(jsonPath("$.objectives").value(objectives));
    }

    @Test
    void publishedRoundDisappearsAfterChangingToDraft() throws Exception {
        Long changedId = insertRound(activeClubId, "Initially published", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        Long remainingId = insertRound(activeClubId, "Still published", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(changedId.toString(), remainingId.toString())));

        assertEquals(1, jdbc.update(
                "UPDATE recruitment_rounds SET publication_status = 'DRAFT' WHERE id = ?", changedId));
        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(remainingId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(changedId.toString()))))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void equivalentUtcAndBangkokTimestampsHaveIdenticalVisibility() throws Exception {
        Instant opensAt = NOW.minusSeconds(60);
        Instant closesAt = NOW.plusSeconds(60);
        Long utcId = insertRound(activeClubId, "UTC round", "PUBLISHED", opensAt, closesAt, null);
        Long bangkokId = insertRound(activeClubId, "Bangkok round", "PUBLISHED", opensAt, closesAt, null);
        ZoneOffset bangkok = ZoneOffset.ofHours(7);
        jdbc.update("UPDATE recruitment_rounds SET opens_at = ?, closes_at = ? WHERE id = ?",
                opensAt.atOffset(bangkok), closesAt.atOffset(bangkok), bangkokId);

        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(utcId.toString(), bangkokId.toString())))
                .andExpect(jsonPath("$.items[0].opensAt").value(opensAt.toString()))
                .andExpect(jsonPath("$.items[1].opensAt").value(opensAt.toString()))
                .andExpect(jsonPath("$.items[0].closesAt").value(closesAt.toString()))
                .andExpect(jsonPath("$.items[1].closesAt").value(closesAt.toString()));
    }

    @ParameterizedTest(name = "expired session on public endpoint: {0}")
    @ValueSource(strings = {"", "/recruitment-rounds"})
    void expiredSessionDoesNotBlockPublicEndpoints(String suffix) throws Exception {
        Long roundId = insertRound(activeClubId, "Open round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        String sessionId = createExpiredSession(sessionRepository);
        Cookie cookie = new Cookie("SESSION", Base64.getEncoder().encodeToString(
                sessionId.getBytes(StandardCharsets.UTF_8)));
        try {
            ResultActions response = mockMvc.perform(get("/api/v1/public/clubs/" + activeClubId + suffix)
                            .cookie(cookie))
                    .andExpect(status().isOk());
            if (suffix.isEmpty()) {
                response.andExpect(jsonPath("$.id").value(activeClubId.toString()));
            } else {
                response.andExpect(jsonPath("$.items[*].id", contains(roundId.toString())));
            }
            assertNull(sessionRepository.findById(sessionId), "Absolute expiry must remove the old session");
        } finally {
            sessionRepository.deleteById(sessionId);
        }
    }

    @Test
    void inactiveClubImmediatelyReturnsNotFoundOnBothEndpoints() throws Exception {
        Long roundId = insertRound(activeClubId, "Open round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        mockMvc.perform(get("/api/v1/public/clubs/{id}", activeClubId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeClubId.toString()));
        getRounds(activeClubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(roundId.toString())));

        assertEquals(1, jdbc.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", activeClubId));
        for (String suffix : List.of("", "/recruitment-rounds")) {
            mockMvc.perform(get("/api/v1/public/clubs/" + activeClubId + suffix))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("CLUB_NOT_FOUND"));
        }
    }

    @Test
    void outOfRangePageReturnsEmptyItemsWithUnchangedTotals() throws Exception {
        insertRound(activeClubId, "Only published round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        getRounds(activeClubId, 3, 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.number").value(3))
                .andExpect(jsonPath("$.page.size").value(2))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @ParameterizedTest(name = "page={0}, size={1}")
    @CsvSource({"-1, 20, page", "0, 0, size", "0, -1, size", "0, 101, size",
            "2147483648, 20, page", "0, abc, size"})
    void invalidPaginationReturnsValidationProblem(String page, String size, String field) throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs/{id}/recruitment-rounds", activeClubId)
                        .param("page", page).param("size", size))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value(field));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 100})
    void validPageSizeBoundariesAreAccepted(int size) throws Exception {
        Long roundId = insertRound(activeClubId, "Published round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);
        getRounds(activeClubId, 0, size)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(roundId.toString())))
                .andExpect(jsonPath("$.page.size").value(size))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource({
            "before opening, 1, 61, false",
            "exact opening, 0, 60, true",
            "inside window, -1, 59, true",
            "exact closing, -60, 0, false",
            "after closing, -61, -1, false"
    })
    void publishedWindowUsesInclusiveOpenAndExclusiveClose(
            String scenario, long opensOffset, long closesOffset, boolean visible
    ) throws Exception {
        Long roundId = insertRound(activeClubId, "Boundary round", "PUBLISHED",
                NOW.plusSeconds(opensOffset), NOW.plusSeconds(closesOffset), null);

        if (visible) {
            getRounds(activeClubId)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items[*].id", contains(roundId.toString())))
                    .andExpect(jsonPath("$.items[0].name").value("Boundary round"))
                    .andExpect(jsonPath("$.page.totalElements").value(1));
        } else {
            expectEmptyPage(activeClubId);
        }
    }

    @ParameterizedTest(name = "ineligible rounds present: {0}")
    @ValueSource(booleans = {false, true})
    void activeClubWithNoEligibleRoundsReturnsEmptyPage(boolean hasIneligibleRounds) throws Exception {
        if (hasIneligibleRounds) {
            insertRound(activeClubId, "Draft only", "DRAFT", NOW.minusSeconds(60), NOW.plusSeconds(60), null);
            insertRound(activeClubId, "Future only", "PUBLISHED", NOW.plusSeconds(1), NOW.plusSeconds(60), null);
        }
        expectEmptyPage(activeClubId);
    }

    @Test
    void missingAndInactiveClubsUseContractNotFoundError() throws Exception {
        insertRound(inactiveClubId, "Hidden club round", "PUBLISHED",
                NOW.minusSeconds(60), NOW.plusSeconds(60), null);

        for (Long id : List.of(Long.MAX_VALUE, inactiveClubId)) {
            for (String suffix : List.of("", "/recruitment-rounds")) {
                String path = "/api/v1/public/clubs/" + id + suffix;
                mockMvc.perform(get(path))
                        .andExpect(status().isNotFound())
                        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                        .andExpect(jsonPath("$.status").value(404))
                        .andExpect(jsonPath("$.code").value("CLUB_NOT_FOUND"))
                        .andExpect(jsonPath("$.instance").value(path))
                        .andExpect(jsonPath("$.traceId").isNotEmpty());
            }
        }
    }

    @ParameterizedTest(name = "invalid club ID: {0}")
    @ValueSource(strings = {"abc", "0", "-1", "1.5", "9223372036854775808", "12345678901234567890"})
    void malformedIdReturnsContractErrorNotServerError(String id) throws Exception {
        for (String suffix : List.of("", "/recruitment-rounds")) {
            mockMvc.perform(get("/api/v1/public/clubs/" + id + suffix))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));
        }
    }

    @Test
    void publicGetPermissionDoesNotMakeOtherMethodsOrProtectedEndpointsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/public/clubs/{id}", activeClubId).with(csrf()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/public/clubs/{id}", activeClubId)
                        .with(user("test-user"))
                        .with(csrf()))
                .andExpect(status().isMethodNotAllowed());
    }

    private ResultActions getRounds(Long clubId) throws Exception {
        return mockMvc.perform(get("/api/v1/public/clubs/{id}/recruitment-rounds", clubId));
    }

    private ResultActions getRounds(Long clubId, int page, int size) throws Exception {
        return mockMvc.perform(get("/api/v1/public/clubs/{id}/recruitment-rounds", clubId)
                .param("page", Integer.toString(page)).param("size", Integer.toString(size)));
    }

    private Long insertTag(String name) {
        Long id = jdbc.queryForObject("INSERT INTO tags (name) VALUES (?) RETURNING id", Long.class, name);
        jdbc.update("INSERT INTO club_tags (club_id, tag_id) VALUES (?, ?)", activeClubId, id);
        return id;
    }

    private static <S extends Session> String createExpiredSession(SessionRepository<S> repository) {
        S session = repository.createSession();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "expired-test-user", null, List.of()));
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        session.setAttribute(AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE, 0L);
        repository.save(session);
        return session.getId();
    }

    private void expectEmptyPage(Long clubId) throws Exception {
        getRounds(clubId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(0))
                .andExpect(jsonPath("$.page.totalPages").value(0));
    }

    private Long insertClub(String name, String status) {
        return jdbc.queryForObject("""
                INSERT INTO clubs
                    (category_id, name, description, objectives, contact_url, contact_email,
                     affiliation_level, affiliation_name, image_url, status, created_by)
                VALUES (?, ?, 'Public club description', 'Learn together', 'https://example.org/contact',
                        'club@example.org', 'University', 'Thammasat University',
                        'https://example.org/logo.png', ?, ?)
                RETURNING id
                """, Long.class, categoryId, name, status, userId);
    }

    private Long insertRound(
            Long clubId, String title, String publicationStatus,
            Instant opensAt, Instant closesAt, Instant closedAt
    ) {
        OffsetDateTime opens = OffsetDateTime.ofInstant(opensAt, ZoneOffset.UTC);
        OffsetDateTime closes = OffsetDateTime.ofInstant(closesAt, ZoneOffset.UTC);
        OffsetDateTime closed = closedAt == null ? null : OffsetDateTime.ofInstant(closedAt, ZoneOffset.UTC);
        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description, eligibility_text,
                     opens_at, closes_at, confirmation_deadline, publication_status,
                     published_at, closed_at, created_by)
                VALUES (?, ?, 2569, 1, 'Internal round configuration', 'Internal eligibility configuration',
                        ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class,
                clubId, title, opens, closes, closes.plusDays(1), publicationStatus,
                "DRAFT".equals(publicationStatus) ? null : opens, closed, userId);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {
        @Bean
        @Primary
        Clock publicClubTestClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
