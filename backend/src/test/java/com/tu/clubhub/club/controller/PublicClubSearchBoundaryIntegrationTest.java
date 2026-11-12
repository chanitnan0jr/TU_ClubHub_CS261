package com.tu.clubhub.club.controller;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises anonymous search and its filters against the real PostgreSQL schema. */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles({"test", "seedtest"})
@Import(PublicClubSearchBoundaryIntegrationTest.FixedClock.class)
@Transactional
class PublicClubSearchBoundaryIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-20T09:30:00Z");
    private static final String PATH = "/api/v1/public/clubs";
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    private long user, firstCategory, secondCategory, tag, alpha, beta, thai;

    @TestConfiguration
    static class FixedClock {
        @Bean @Primary Clock task62Clock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
    }

    @BeforeEach
    void fixtures() {
        String unique = UUID.randomUUID().toString();
        user = jdbc.queryForObject("INSERT INTO users(tu_username, display_name) VALUES (?, ?) RETURNING id",
                Long.class, "task62-" + unique, "Task62 creator");
        firstCategory = id("INSERT INTO club_categories(name) VALUES (?) RETURNING id", "Task62 first " + unique);
        secondCategory = id("INSERT INTO club_categories(name) VALUES (?) RETURNING id", "Task62 second " + unique);
        tag = id("INSERT INTO tags(name) VALUES (?) RETURNING id", "Task62 tag " + unique);
        long secondTag = id("INSERT INTO tags(name) VALUES (?) RETURNING id", "Task62 other " + unique);
        alpha = club("Task62 Alpha " + unique, firstCategory, "ACTIVE");
        beta = club("Task62 beta " + unique, firstCategory, "ACTIVE");
        thai = club("Task62 ชมรมกีฬา " + unique, secondCategory, "ACTIVE");
        club("Task62 Hidden " + unique, firstCategory, "INACTIVE");
        jdbc.update("INSERT INTO club_tags(club_id, tag_id) VALUES (?, ?), (?, ?), (?, ?)",
                alpha, tag, alpha, secondTag, beta, tag);
        round(alpha, NOW, NOW.plusSeconds(3600), null, "PUBLISHED");
        round(beta, NOW.minusSeconds(3600), NOW, null, "PUBLISHED");
        round(thai, NOW.minusSeconds(3600), NOW.plusSeconds(3600), NOW.minusSeconds(1), "PUBLISHED");
        round(beta, NOW.minusSeconds(3600), NOW.plusSeconds(3600), null, "DRAFT");
    }

    private long id(String sql, String value) { return jdbc.queryForObject(sql, Long.class, value); }
    private long club(String name, long category, String status) {
        return jdbc.queryForObject("""
                INSERT INTO clubs(name, category_id, status, description, created_by)
                VALUES (?, ?, ?, 'public description', ?) RETURNING id
                """, Long.class, name, category, status, user);
    }
    private void round(long club, Instant opens, Instant closes, Instant closed, String publication) {
        jdbc.update("""
                INSERT INTO recruitment_rounds(club_id, title, academic_year, semester, description,
                    opens_at, closes_at, closed_at, confirmation_deadline, publication_status, published_at, created_by)
                VALUES (?, 'Task62 round', 2569, 1, 'description', ?, ?, ?, ?, ?, ?, ?)
                """, club, Timestamp.from(opens), Timestamp.from(closes),
                closed == null ? null : Timestamp.from(closed), Timestamp.from(closes.plusSeconds(3600)),
                publication, publication.equals("PUBLISHED") ? Timestamp.from(opens) : null, user);
    }

    @Test
    void anonymousSearchSupportsEnglishThaiAndLiteralWildcards() throws Exception {
        mvc.perform(get(PATH).param("q", "  aLpHa  "))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(Long.toString(alpha)))
                .andExpect(jsonPath("$.items[0].hasOpenRecruitment").value(true))
                .andExpect(jsonPath("$.items[0].tags", hasSize(2)))
                .andExpect(jsonPath("$.items[0].keys()", containsInAnyOrder("id", "name", "description",
                        "affiliationLevel", "affiliationName", "imageUrl", "category", "tags", "hasOpenRecruitment")));
        mvc.perform(get(PATH).param("q", "ชมรมกีฬา"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(Long.toString(thai)));
        for (String wildcard : new String[]{"%", "_", "\\", "!"}) {
            mvc.perform(get(PATH).param("q", "Task62" + wildcard)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.page.totalElements").value(0));
        }
    }

    @Test
    void filtersCombineAndNoTagJoinDuplicatesOrInactiveClubs() throws Exception {
        mvc.perform(get(PATH).param("q", "   ").param("categoryId", Long.toString(firstCategory)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page.totalElements").value(2));
        mvc.perform(get(PATH).param("q", "Task62").param("categoryId", Long.toString(firstCategory))
                .param("tagId", Long.toString(tag)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.items[*].id", containsInAnyOrder(Long.toString(alpha), Long.toString(beta))));
        mvc.perform(get(PATH).param("q", "Task62").param("categoryId", Long.toString(secondCategory))
                .param("tagId", Long.toString(tag)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    void recruitmentBoundariesAndManualClosureAreRespected() throws Exception {
        mvc.perform(get(PATH).param("q", "Task62").param("recruitmentStatus", "OPEN"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(Long.toString(alpha)));
        mvc.perform(get(PATH).param("q", "Task62").param("recruitmentStatus", "CLOSED"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].id", containsInAnyOrder(Long.toString(beta), Long.toString(thai))));
    }

    @Test
    void paginationAndSortUseZeroBasedPageMetadata() throws Exception {
        mvc.perform(get(PATH).param("q", "Task62").param("size", "1").param("page", "1")
                .param("sort", "name,asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(Long.toString(beta)))
                .andExpect(jsonPath("$.page.number").value(1)).andExpect(jsonPath("$.page.size").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(3)).andExpect(jsonPath("$.page.totalPages").value(3));
        mvc.perform(get(PATH).param("q", "Task62").param("size", "1").param("sort", "name,desc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(Long.toString(thai)));
        mvc.perform(get(PATH).param("q", "Task62").param("page", "10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.page.totalElements").value(3));
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "page,abc", "size,0", "size,101", "categoryId,0", "tagId,-2",
            "tagId,9223372036854775808", "categoryId,12345678901234567890",
            "recruitmentStatus,INVALID", "sort,invalid"})
    void invalidParametersReturnValidationProblem(String parameter, String value) throws Exception {
        mvc.perform(get(PATH).param(parameter, value)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void overlongQueryReturnsValidationProblem() throws Exception {
        mvc.perform(get(PATH).param("q", "x".repeat(201))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
