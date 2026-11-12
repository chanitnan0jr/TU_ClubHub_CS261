package com.tu.clubhub.club.repository;

import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicClubSearchItemDto;
import com.tu.clubhub.club.dto.PublicClubTagDto;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PublicClubSearchRepository {
    private static final String OPEN = """
            EXISTS (SELECT 1 FROM recruitment_rounds r
                    WHERE r.club_id = c.id AND r.publication_status = 'PUBLISHED'
                      AND r.opens_at <= ? AND ? < r.closes_at AND r.closed_at IS NULL)
            """;

    private final JdbcTemplate jdbc;

    public PublicClubSearchRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Criteria(String query, Long categoryId, Long tagId, String recruitmentStatus,
                           String sort, Instant now, int size, long offset) {}

    public record Result(List<PublicClubSearchItemDto> items, long total) {}

    public Result search(Criteria criteria) {
        OffsetDateTime now = criteria.now().atOffset(ZoneOffset.UTC);
        StringBuilder where = new StringBuilder(" WHERE c.status = 'ACTIVE'");
        List<Object> filters = new ArrayList<>();
        if (criteria.query() != null) {
            where.append(" AND LOWER(c.name) LIKE LOWER(?) ESCAPE '!'");
            String query = criteria.query().replace("!", "!!").replace("%", "!%").replace("_", "!_");
            filters.add("%" + query + "%");
        }
        if (criteria.categoryId() != null) {
            where.append(" AND c.category_id = ?");
            filters.add(criteria.categoryId());
        }
        if (criteria.tagId() != null) {
            where.append(" AND EXISTS (SELECT 1 FROM club_tags ct WHERE ct.club_id = c.id AND ct.tag_id = ?)");
            filters.add(criteria.tagId());
        }
        if (!criteria.recruitmentStatus().equals("ALL")) {
            where.append(" AND ");
            if (criteria.recruitmentStatus().equals("CLOSED")) where.append("NOT ");
            where.append(OPEN);
            filters.add(now);
            filters.add(now);
        }
        String from = " FROM clubs c JOIN club_categories cc ON cc.id = c.category_id" + where;
        Long count = jdbc.queryForObject("SELECT count(*)" + from, Long.class, filters.toArray());

        List<Object> params = new ArrayList<>();
        params.add(now);
        params.add(now);
        params.addAll(filters);
        params.add(criteria.size());
        params.add(criteria.offset());
        String direction = criteria.sort().equals("name,desc") ? "DESC" : "ASC";
        List<PublicClubSearchItemDto> clubs = jdbc.query("""
                SELECT c.id, c.name, c.description, c.affiliation_level, c.affiliation_name,
                       c.image_url, cc.id AS category_id, cc.name AS category_name,
                """ + OPEN + " AS has_open " + from + " ORDER BY c.name " + direction + ", c.id ASC LIMIT ? OFFSET ?",
                (rs, row) -> new PublicClubSearchItemDto(rs.getString("id"), rs.getString("name"),
                        rs.getString("description"), rs.getString("affiliation_level"), rs.getString("affiliation_name"),
                        rs.getString("image_url"), new PublicClubCategoryDto(rs.getString("category_id"),
                        rs.getString("category_name")), List.of(), rs.getBoolean("has_open")), params.toArray());
        if (clubs.isEmpty()) return new Result(clubs, count == null ? 0 : count);

        List<Long> ids = clubs.stream().map(club -> Long.valueOf(club.id())).toList();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        Map<Long, List<PublicClubTagDto>> tags = new HashMap<>();
        jdbc.query("SELECT ct.club_id, t.id, t.name FROM club_tags ct JOIN tags t ON t.id=ct.tag_id "
                + "WHERE ct.club_id IN (" + placeholders + ") ORDER BY ct.club_id, t.id", rs -> {
                    tags.computeIfAbsent(rs.getLong("club_id"), ignored -> new ArrayList<>())
                            .add(new PublicClubTagDto(rs.getString("id"), rs.getString("name")));
                }, ids.toArray());
        List<PublicClubSearchItemDto> items = clubs.stream().map(club -> new PublicClubSearchItemDto(
                club.id(), club.name(), club.description(), club.affiliationLevel(), club.affiliationName(),
                club.imageUrl(), club.category(), List.copyOf(tags.getOrDefault(Long.valueOf(club.id()), List.of())),
                club.hasOpenRecruitment())).toList();
        return new Result(items, count == null ? 0 : count);
    }
}
