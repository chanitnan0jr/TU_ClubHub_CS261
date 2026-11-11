package com.tu.clubhub.club.repository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.tu.clubhub.club.dto.PublicClubSearchItemDto;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubCategoryDto;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubTagDto;
import com.tu.clubhub.club.dto.ClubResponseDto.PublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.OpenPublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicClubTagDto;
import com.tu.clubhub.club.dto.PublicOpenCallDto;

@Repository
public class ClubProfileQueryRepository {

    /**
     * Public open-window rule for rounds aliased r: published, opens_at <= now < closes_at
     * and not manually closed. Binds the evaluation instant twice.
     */
    private static final String OPEN_ROUND = """
            r.publication_status = 'PUBLISHED'
              AND r.opens_at <= ?
              AND ? < r.closes_at
              AND r.closed_at IS NULL""";

    /** Open rounds whose club is publicly visible (ACTIVE), as on the public club profile. */
    private static final String OPEN_CALLS_FROM = """
            FROM recruitment_rounds r
            JOIN clubs c ON c.id = r.club_id
            JOIN club_categories cc ON cc.id = c.category_id
            WHERE c.status = 'ACTIVE'
              AND %s
            """.formatted(OPEN_ROUND);

    private final JdbcTemplate jdbcTemplate;

    public ClubProfileQueryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // อ่านหมวดหมู่ของชมรม
    public ClubCategoryDto findCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }

        List<ClubCategoryDto> categories = jdbcTemplate.query(
                """
                SELECT id, name
                FROM club_categories
                WHERE id = ?
                """,
                (rs, rowNum) -> new ClubCategoryDto(
                        rs.getString("id"),
                        rs.getString("name")
                ),
                categoryId
        );

        return categories.isEmpty() ? null : categories.get(0);
    }

    // อ่านแท็กของชมรม
    public List<ClubTagDto> findTags(Long clubId) {
        return jdbcTemplate.query(
                """
                SELECT t.id, t.name
                FROM tags t
                JOIN club_tags ct ON ct.tag_id = t.id
                WHERE ct.club_id = ?
                ORDER BY t.id
                """,
                (rs, rowNum) -> new ClubTagDto(
                        rs.getString("id"),
                        rs.getString("name")
                ),
                clubId
        );
    }

    /** Every club category, ordered by name then id (public list). */
    public List<PublicClubCategoryDto> findAllCategories() {
        return jdbcTemplate.query(
                "SELECT id, name FROM club_categories ORDER BY name, id",
                (rs, rowNum) -> new PublicClubCategoryDto(rs.getString("id"), rs.getString("name"))
        );
    }

    /** Every interest tag, ordered by name then id (public list). */
    public List<PublicClubTagDto> findAllTags() {
        return jdbcTemplate.query(
                "SELECT id, name FROM tags ORDER BY name, id",
                (rs, rowNum) -> new PublicClubTagDto(rs.getString("id"), rs.getString("name"))
        );
    }

    public boolean categoryExists(Long categoryId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM club_categories WHERE id = ?)",
                Boolean.class,
                categoryId
        );
        return Boolean.TRUE.equals(exists);
    }

    /** Returns the subset of the given tag ids that exist. */
    public Set<Long> findExistingTagIds(Collection<Long> tagIds) {
        if (tagIds.isEmpty()) {
            return Set.of();
        }
        String placeholders = String.join(", ", Collections.nCopies(tagIds.size(), "?"));
        return new HashSet<>(jdbcTemplate.queryForList(
                "SELECT id FROM tags WHERE id IN (" + placeholders + ")",
                Long.class,
                tagIds.toArray()
        ));
    }

    /**
     * Replaces the club's tag set. Runs in the caller's transaction, so a later
     * failure rolls the tags back together with the profile update.
     */
    public void replaceClubTags(Long clubId, Collection<Long> tagIds) {
        jdbcTemplate.update("DELETE FROM club_tags WHERE club_id = ?", clubId);
        jdbcTemplate.batchUpdate(
                "INSERT INTO club_tags (club_id, tag_id) VALUES (?, ?)",
                tagIds.stream().map(tagId -> new Object[] {clubId, tagId}).toList()
        );
    }

    // อ่านเฉพาะรอบรับสมัครที่เผยแพร่แล้ว
    public List<PublicRecruitmentRoundDto> findPublishedRounds(
            Long clubId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id, title AS name, description, opens_at, closes_at, closed_at,
                       results_scheduled_at
                FROM recruitment_rounds
                WHERE club_id = ?
                  AND publication_status = 'PUBLISHED'
                ORDER BY opens_at, id
                """,
                (rs, rowNum) -> new PublicRecruitmentRoundDto(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        toInstant(rs.getTimestamp("opens_at")),
                        toInstant(rs.getTimestamp("closes_at")),
                        toInstant(rs.getTimestamp("closed_at")),
                        toInstant(rs.getTimestamp("results_scheduled_at"))
                ),
                clubId
        );
    }

    /**
     * Returns only rounds for the requested club that are published, currently
     * open at the supplied instant, and not manually closed. The caller supplies
     * a single instant so filtering and counting use identical time boundaries.
     */
    public List<OpenPublicRecruitmentRoundDto> findOpenPublicRounds(
            Long clubId,
            Instant now,
            int size,
            long offset
    ) {
        OffsetDateTime evaluationTime = utc(now);
        return jdbcTemplate.query(
                """
                SELECT r.id, r.title AS name, r.description, r.opens_at, r.closes_at,
                       r.results_scheduled_at
                FROM recruitment_rounds r
                WHERE r.club_id = ?
                  AND %s
                ORDER BY r.opens_at, r.id
                LIMIT ? OFFSET ?
                """.formatted(OPEN_ROUND),
                (rs, rowNum) -> new OpenPublicRecruitmentRoundDto(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        toInstant(rs.getObject("opens_at", OffsetDateTime.class)),
                        toInstant(rs.getObject("closes_at", OffsetDateTime.class)),
                        toInstant(rs.getObject("results_scheduled_at", OffsetDateTime.class))
                ),
                clubId,
                evaluationTime,
                evaluationTime,
                size,
                offset
        );
    }

    /** Counts all qualifying rounds before pagination is applied. */
    public long countOpenPublicRounds(Long clubId, Instant now) {
        OffsetDateTime evaluationTime = utc(now);
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM recruitment_rounds r
                WHERE r.club_id = ?
                  AND %s
                """.formatted(OPEN_ROUND),
                Long.class,
                clubId,
                evaluationTime,
                evaluationTime
        );
        return count == null ? 0L : count;
    }

    /**
     * Open Call Board page: open rounds of every ACTIVE club, soonest deadline
     * first. Uses the per-club open rule and the public profile's club rule.
     */
    public List<PublicOpenCallDto> findOpenCalls(Instant now, int size, long offset) {
        OffsetDateTime evaluationTime = utc(now);
        return jdbcTemplate.query(
                """
                SELECT r.id, r.title AS name, r.description, r.opens_at, r.closes_at,
                       r.results_scheduled_at, c.id AS club_id, c.name AS club_name,
                       c.image_url AS club_image_url, cc.id AS category_id, cc.name AS category_name
                %s
                ORDER BY r.closes_at, r.id
                LIMIT ? OFFSET ?
                """.formatted(OPEN_CALLS_FROM),
                (rs, rowNum) -> new PublicOpenCallDto(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        toInstant(rs.getObject("opens_at", OffsetDateTime.class)),
                        toInstant(rs.getObject("closes_at", OffsetDateTime.class)),
                        toInstant(rs.getObject("results_scheduled_at", OffsetDateTime.class)),
                        new PublicOpenCallDto.ClubSummary(
                                rs.getString("club_id"),
                                rs.getString("club_name"),
                                rs.getString("club_image_url"),
                                new PublicClubCategoryDto(
                                        rs.getString("category_id"),
                                        rs.getString("category_name")))
                ),
                evaluationTime,
                evaluationTime,
                size,
                offset
        );
    }

    /** Counts Open Call Board rounds with the same joins and filters as the page. */
    public long countOpenCalls(Instant now) {
        OffsetDateTime evaluationTime = utc(now);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " + OPEN_CALLS_FROM,
                Long.class,
                evaluationTime,
                evaluationTime
        );
        return count == null ? 0L : count;
    }
    /** Search active clubs with filters and deterministic pagination. */
    public List<PublicClubSearchItemDto> searchPublicClubs(
            String q,
            Long categoryId,
            Long tagId,
            String recruitmentStatus,
            Instant now,
            boolean descending,
            int size,
            long offset
    ) {
        ClubSearchFilter filter = buildSearchFilter(
                q, categoryId, tagId, recruitmentStatus, now);

        String direction = descending ? "DESC" : "ASC";

        String sql = """
                SELECT c.id, c.name, c.description,
                       c.affiliation_level, c.affiliation_name,
                       c.image_url,
                       cc.id AS category_id,
                       cc.name AS category_name,
                       EXISTS (
                           SELECT 1
                           FROM recruitment_rounds r
                           WHERE r.club_id = c.id
                             AND %s
                       ) AS has_open_recruitment
                FROM clubs c
                JOIN club_categories cc ON cc.id = c.category_id
                %s
                ORDER BY c.name %s, c.id ASC
                LIMIT ? OFFSET ?
                """.formatted(
                        OPEN_ROUND,
                        filter.whereClause(),
                        direction
                );

        OffsetDateTime evaluationTime = utc(now);

        List<Object> params = new ArrayList<>();
        params.add(evaluationTime);
        params.add(evaluationTime);
        params.addAll(filter.params());
        params.add(size);
        params.add(offset);

        List<PublicClubSearchItemDto> items = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PublicClubSearchItemDto(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getString("affiliation_level"),
                        rs.getString("affiliation_name"),
                        rs.getString("image_url"),
                        new PublicClubCategoryDto(
                                rs.getString("category_id"),
                                rs.getString("category_name")
                        ),
                        List.of(),
                        rs.getBoolean("has_open_recruitment")
                ),
                params.toArray()
        );

        if (items.isEmpty()) {
            return items;
        }

        Map<String, List<PublicClubTagDto>> tagsByClub =
                findSearchClubTags(items);

        return items.stream()
                .map(item -> new PublicClubSearchItemDto(
                        item.id(),
                        item.name(),
                        item.description(),
                        item.affiliationLevel(),
                        item.affiliationName(),
                        item.imageUrl(),
                        item.category(),
                        tagsByClub.getOrDefault(item.id(), List.of()),
                        item.hasOpenRecruitment()
                ))
                .toList();
    }

    /** Count matching clubs before pagination. */
    public long countPublicClubs(
            String q,
            Long categoryId,
            Long tagId,
            String recruitmentStatus,
            Instant now
    ) {
        ClubSearchFilter filter = buildSearchFilter(
                q, categoryId, tagId, recruitmentStatus, now);

        String sql = """
                SELECT COUNT(*)
                FROM clubs c
                %s
                """.formatted(filter.whereClause());

        Long count = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                filter.params().toArray()
        );

        return count == null ? 0L : count;
    }

    /** Load tags for the entire page in one query. */
    private Map<String, List<PublicClubTagDto>> findSearchClubTags(
            List<PublicClubSearchItemDto> items
    ) {
        List<Long> clubIds = items.stream()
                .map(item -> Long.valueOf(item.id()))
                .toList();

        String placeholders = String.join(
                ", ", Collections.nCopies(clubIds.size(), "?"));

        String sql = """
                SELECT ct.club_id, t.id AS tag_id, t.name AS tag_name
                FROM club_tags ct
                JOIN tags t ON t.id = ct.tag_id
                WHERE ct.club_id IN (%s)
                ORDER BY ct.club_id, t.id
                """.formatted(placeholders);

        Map<String, List<PublicClubTagDto>> result = new HashMap<>();

        jdbcTemplate.query(
                sql,
                rs -> {
                    String clubId = rs.getString("club_id");

                    result.computeIfAbsent(
                            clubId, ignored -> new ArrayList<>()
                    ).add(new PublicClubTagDto(
                            rs.getString("tag_id"),
                            rs.getString("tag_name")
                    ));
                },
                clubIds.toArray()
        );

        return result;
    }

    /** Shared WHERE clause for page and count queries. */
    private ClubSearchFilter buildSearchFilter(
            String q,
            Long categoryId,
            Long tagId,
            String recruitmentStatus,
            Instant now
    ) {
        StringBuilder where = new StringBuilder(
                "WHERE c.status = 'ACTIVE'");

        List<Object> params = new ArrayList<>();

        if (q != null && !q.isBlank()) {
            String escaped = q.strip()
                    .replace("!", "!!")
                    .replace("%", "!%")
                    .replace("_", "!_");

            where.append(" AND c.name ILIKE ? ESCAPE '!'");
            params.add("%" + escaped + "%");
        }

        if (categoryId != null) {
            where.append(" AND c.category_id = ?");
            params.add(categoryId);
        }

        if (tagId != null) {
            where.append("""
                     AND EXISTS (
                         SELECT 1
                         FROM club_tags ct
                         WHERE ct.club_id = c.id
                           AND ct.tag_id = ?
                     )
                    """);
            params.add(tagId);
        }

        String status = recruitmentStatus == null
                ? "ALL" : recruitmentStatus;

        if (!Set.of("ALL", "OPEN", "CLOSED").contains(status)) {
            throw new IllegalArgumentException(
                    "Invalid recruitment status");
        }

        if (!"ALL".equals(status)) {
            where.append(" AND ");

            if ("CLOSED".equals(status)) {
                where.append("NOT ");
            }

            where.append("""
                    EXISTS (
                        SELECT 1
                        FROM recruitment_rounds r
                        WHERE r.club_id = c.id
                          AND %s
                    )
                    """.formatted(OPEN_ROUND));

            OffsetDateTime evaluationTime = utc(now);
            params.add(evaluationTime);
            params.add(evaluationTime);
        }

        return new ClubSearchFilter(where.toString(), params);
    }

    private record ClubSearchFilter(
            String whereClause,
            List<Object> params
    ) {
    }
    private static OffsetDateTime utc(Instant now) {
        return OffsetDateTime.ofInstant(now, ZoneOffset.UTC);
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Instant toInstant(OffsetDateTime timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
