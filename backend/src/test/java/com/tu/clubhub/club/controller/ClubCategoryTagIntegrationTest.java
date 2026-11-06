package com.tu.clubhub.club.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * US-06 AC-01: public category/tag lists and category/tag edits through PUT /api/v1/clubs/{clubId}
 * on PostgreSQL. Not @Transactional: each request commits or rolls back for real, so
 * "nothing changed" is checked against committed rows. Fixtures are removed after each test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "seedtest"})
class ClubCategoryTagIntegrationTest {

    private static final long MISSING_ID = Long.MAX_VALUE - 7;

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @MockitoSpyBean private ClubProfileQueryRepository profileQueries;

    private String prefix;
    private long committee;
    private long student;
    private long categoryA;
    private long categoryB;
    private long clubId;
    private long membership;
    /** Index order is name order; ids run the other way. */
    private final List<Long> tags = new ArrayList<>();

    @BeforeEach
    void fixtures() {
        prefix = "zz-b4-" + UUID.randomUUID();
        committee = account("committee");
        student = account("student");
        // Inserted in reverse name order so ordering by id would fail the list tests.
        categoryB = jdbc.queryForObject("INSERT INTO club_categories (name) VALUES (?) RETURNING id",
                Long.class, prefix + "-category-b");
        categoryA = jdbc.queryForObject("INSERT INTO club_categories (name) VALUES (?) RETURNING id",
                Long.class, prefix + "-category-a");
        for (int i = 12; i >= 1; i--) {
            tags.add(0, jdbc.queryForObject("INSERT INTO tags (name) VALUES (?) RETURNING id",
                    Long.class, "%s-tag-%02d".formatted(prefix, i)));
        }
        clubId = jdbc.queryForObject("""
                INSERT INTO clubs (category_id, name, description, created_by)
                VALUES (?, ?, 'Fictional club', ?) RETURNING id
                """, Long.class, categoryA, prefix + "-club", committee);
        jdbc.update("INSERT INTO club_tags (club_id, tag_id) VALUES (?, ?)", clubId, tags.get(0));
        membership = jdbc.queryForObject("""
                INSERT INTO club_memberships (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', now() - interval '1 day') RETURNING id
                """, Long.class, clubId, committee);
        jdbc.update("""
                INSERT INTO club_committee_assignments
                    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
                VALUES (?, 'Committee', 'COMMITTEE', now() - interval '1 day', now() + interval '1 day', ?)
                """, membership, committee);
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM club_committee_assignments WHERE membership_id = ?", membership);
        jdbc.update("DELETE FROM club_memberships WHERE id = ?", membership);
        jdbc.update("DELETE FROM clubs WHERE id = ?", clubId); // cascades club_tags
        jdbc.update("DELETE FROM tags WHERE name LIKE ?", prefix + "%");
        jdbc.update("DELETE FROM club_categories WHERE name LIKE ?", prefix + "%");
        jdbc.update("DELETE FROM student_profiles WHERE user_id IN (?, ?)", committee, student);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", committee, student);
    }

    @Test
    void anonymousCallerListsCategoriesByName() throws Exception {
        mvc.perform(get("/api/v1/public/club-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.name =~ /" + prefix + ".*/)].name")
                        .value(contains(prefix + "-category-a", prefix + "-category-b")))
                .andExpect(jsonPath("$.items[?(@.name =~ /" + prefix + ".*/)].id")
                        .value(contains(Long.toString(categoryA), Long.toString(categoryB))))
                .andExpect(jsonPath("$.items[0].description").doesNotExist());
    }

    @Test
    void anonymousCallerListsInterestTagsByName() throws Exception {
        mvc.perform(get("/api/v1/public/interest-tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.name =~ /" + prefix + ".*/)].id")
                        .value(contains(tags.stream().map(String::valueOf).toArray())));
    }

    @Test
    void validCategoryAndTagsArePersistedAndReturned() throws Exception {
        update(committee, body(categoryB, tags.get(2), tags.get(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryId").value(Long.toString(categoryB)))
                .andExpect(jsonPath("$.category.id").value(Long.toString(categoryB)))
                .andExpect(jsonPath("$.category.name").value(prefix + "-category-b"))
                .andExpect(jsonPath("$.tags[*].id").value(containsInAnyOrder(id(tags.get(1)), id(tags.get(2)))));

        assertEquals(categoryB, storedCategory());
        assertEquals(Set.of(tags.get(1), tags.get(2)), storedTags());
        assertEquals(prefix + "-changed", storedName());

        // AC-05: the public profile shows the new category and tags.
        mvc.perform(get("/api/v1/public/clubs/" + clubId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.id").value(Long.toString(categoryB)))
                .andExpect(jsonPath("$.tags[*].id").value(containsInAnyOrder(id(tags.get(1)), id(tags.get(2)))));
    }

    @Test
    void emptyTagIdsRemovesEveryTag() throws Exception {
        update(committee, body(categoryA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags", hasSize(0)));

        assertEquals(Set.of(), storedTags());
    }

    @Test
    void unknownCategoryIsRejectedAndNothingChanges() throws Exception {
        update(committee, body(MISSING_ID, tags.get(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(contains("categoryId")));

        assertUnchanged();
    }

    @Test
    void unknownTagIsRejectedAndNothingChanges() throws Exception {
        update(committee, body(categoryB, tags.get(1), MISSING_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(contains("tagIds[1]")));

        assertUnchanged();
    }

    @Test
    void repeatedTagIsRejectedAndNothingChanges() throws Exception {
        update(committee, body(categoryB, tags.get(1), tags.get(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(contains("tagIds[1]")));

        assertUnchanged();
    }

    @Test
    void moreThanTenTagsAreRejectedAndNothingChanges() throws Exception {
        update(committee, body(categoryB, tags.subList(0, 11).toArray(Long[]::new)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(contains("tagIds")));

        assertUnchanged();
    }

    @Test
    void tenTagsAreAccepted() throws Exception {
        update(committee, body(categoryA, tags.subList(0, 10).toArray(Long[]::new)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags", hasSize(10)));
    }

    @Test
    void missingCategoryAndTagsAreRejected() throws Exception {
        update(committee, "{\"name\":\"" + prefix + "-changed\",\"description\":\"Changed\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder("categoryId", "tagIds")));

        assertUnchanged();
    }

    @Test
    void nonCommitteeIsStillDenied() throws Exception {
        update(student, body(categoryB, tags.get(1)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        assertUnchanged();
    }

    @Test
    void failedTagWriteRollsBackTheWholeUpdate() throws Exception {
        // Simulates a tag removed between the existence check and the insert: the FK rejects it.
        doReturn(Set.of(MISSING_ID)).when(profileQueries).findExistingTagIds(any());

        update(committee, body(categoryB, MISSING_ID))
                .andExpect(status().isInternalServerError());

        assertUnchanged();
    }

    private void assertUnchanged() {
        assertEquals(prefix + "-club", storedName());
        assertEquals(categoryA, storedCategory());
        assertEquals(Set.of(tags.get(0)), storedTags());
    }

    private ResultActions update(long userId, String json) throws Exception {
        return mvc.perform(put("/api/v1/clubs/" + clubId)
                .with(authentication(UsernamePasswordAuthenticationToken.authenticated(
                        new ClubHubPrincipal(userId, prefix + userId, "USER"), null, List.of())))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private String body(long categoryId, Long... tagIds) {
        String tagList = java.util.Arrays.stream(tagIds).map(tagId -> "\"" + tagId + "\"")
                .collect(Collectors.joining(","));
        return """
                {"name":"%s-changed","description":"Changed","categoryId":"%d","tagIds":[%s]}
                """.formatted(prefix, categoryId, tagList);
    }

    private static String id(long value) {
        return Long.toString(value);
    }

    private String storedName() {
        return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
    }

    private long storedCategory() {
        return jdbc.queryForObject("SELECT category_id FROM clubs WHERE id = ?", Long.class, clubId);
    }

    private Set<Long> storedTags() {
        return Set.copyOf(jdbc.queryForList("SELECT tag_id FROM club_tags WHERE club_id = ?", Long.class, clubId));
    }

    private long account(String role) {
        long id = jdbc.queryForObject(
                "INSERT INTO users (tu_username, display_name) VALUES (?, 'Fictional user') RETURNING id",
                Long.class, prefix + "-" + role);
        jdbc.update("INSERT INTO student_profiles (user_id, student_code, student_status) VALUES (?, ?, 'ACTIVE')",
                id, "B4-" + id);
        return id;
    }
}
