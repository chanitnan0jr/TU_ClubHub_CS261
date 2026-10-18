package com.tu.clubhub.club.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles({"test", "seedtest"})
@Transactional
class PublicClubProfileQueryRepositoryTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ClubProfileQueryRepository queries;

    private Long clubA;
    private Long clubB;
    private Long userId;
    private Instant now;

    @BeforeEach
    void insertFixtures() {
        String suffix = UUID.randomUUID().toString();
        userId = jdbc.queryForObject(
                "INSERT INTO users (tu_username, display_name) VALUES (?, ?) RETURNING id",
                Long.class, "public-query-" + suffix, "Test user");
        Long categoryId = jdbc.queryForObject(
                "INSERT INTO club_categories (name) VALUES (?) RETURNING id",
                Long.class, "Public query category " + suffix);
        clubA = insertClub(categoryId, "A " + suffix);
        clubB = insertClub(categoryId, "B " + suffix);
        now = Instant.parse("2026-10-18T12:00:00Z");

        insertRound(clubA, "published open", "PUBLISHED", now.minusSeconds(60), now.plusSeconds(60), null);
        insertRound(clubA, "draft open", "DRAFT", now.minusSeconds(60), now.plusSeconds(60), null);
        insertRound(clubA, "not yet open", "PUBLISHED", now.plusSeconds(1), now.plusSeconds(60), null);
        insertRound(clubA, "already closed", "PUBLISHED", now.minusSeconds(60), now, null);
        insertRound(clubA, "opens exactly now", "PUBLISHED", now, now.plusSeconds(60), null);
        insertRound(clubA, "manually closed", "PUBLISHED", now.minusSeconds(60), now.plusSeconds(60), now.minusSeconds(1));
        insertRound(clubB, "other club", "PUBLISHED", now.minusSeconds(60), now.plusSeconds(60), null);
    }

    @Test
    void databaseFiltersStatusWindowManualCloseAndClubBeforePagination() {
        var firstPage = queries.findOpenPublicRounds(clubA, now, 1, 0);
        var secondPage = queries.findOpenPublicRounds(clubA, now, 1, 1);

        assertEquals(2L, queries.countOpenPublicRounds(clubA, now));
        assertEquals(1, firstPage.size());
        assertEquals(1, secondPage.size());
        assertEquals("published open", firstPage.get(0).name());
        assertEquals("opens exactly now", secondPage.get(0).name());
        assertEquals(0L, queries.countOpenPublicRounds(clubB, now));
        assertEquals(0L, queries.countOpenPublicRounds(clubA, now.plusSeconds(60)));
    }

    private Long insertClub(Long categoryId, String name) {
        return jdbc.queryForObject(
                "INSERT INTO clubs (category_id, name, description, created_by) VALUES (?, ?, ?, ?) RETURNING id",
                Long.class, categoryId, name, "Public profile query test", userId);
    }

    private void insertRound(
            Long clubId,
            String title,
            String status,
            Instant opensAt,
            Instant closesAt,
            Instant closedAt
    ) {
        OffsetDateTime opens = OffsetDateTime.ofInstant(opensAt, ZoneOffset.UTC);
        OffsetDateTime closes = OffsetDateTime.ofInstant(closesAt, ZoneOffset.UTC);
        OffsetDateTime closed = closedAt == null ? null : OffsetDateTime.ofInstant(closedAt, ZoneOffset.UTC);
        jdbc.update("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description,
                     opens_at, closes_at, confirmation_deadline,
                     publication_status, published_at, closed_at, created_by)
                VALUES (?, ?, 2569, 1, 'Test round', ?, ?, ?, ?, ?, ?, ?)
                """,
                clubId, title, opens, closes, closes.plusDays(1), status,
                "PUBLISHED".equals(status) ? opens : null, closed, userId);
    }
}
