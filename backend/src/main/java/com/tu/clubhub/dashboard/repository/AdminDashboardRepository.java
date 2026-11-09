package com.tu.clubhub.dashboard.repository;

import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import com.tu.clubhub.dashboard.dto.AdminDashboardFilter;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse.CategoryStats;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse.ClubStats;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse.ClubStatsPage;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse.SummaryMetrics;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse.TopClub;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

@Repository
public class AdminDashboardRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public AdminDashboardRepository(JdbcTemplate jdbc) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbc);
    }

    private static final String FILTERED_DATA = """
            WITH filtered_clubs AS (
                SELECT c.id, c.name, c.status, c.category_id,
                       cat.name AS category_name
                FROM clubs c
                JOIN club_categories cat ON cat.id = c.category_id
                WHERE (:namePattern IS NULL
                       OR c.name ILIKE :namePattern ESCAPE '\\')
                  AND (:categoryId IS NULL OR c.category_id = :categoryId)
                  AND (:clubStatus = 'ALL' OR c.status = :clubStatus)
            ),
            filtered_rounds AS (
                SELECT r.*,
                       (
                           c.status = 'ACTIVE'
                           AND r.publication_status = 'PUBLISHED'
                           AND r.published_at IS NOT NULL
                           AND r.published_at <= :now
                           AND r.opens_at <= :now
                           AND :now < r.closes_at
                           AND r.closed_at IS NULL
                       ) AS is_open
                FROM recruitment_rounds r
                JOIN filtered_clubs c ON c.id = r.club_id
                WHERE r.publication_status <> 'DRAFT'
                  AND (:academicYear IS NULL
                       OR r.academic_year = :academicYear)
                  AND (:semester IS NULL OR r.semester = :semester)
            ),
            filtered_applications AS (
                SELECT a.*,
                       (
                           r.results_published_at IS NOT NULL
                           AND r.results_published_at <= :now
                       ) AS results_visible
                FROM applications a
                JOIN filtered_rounds r
                  ON r.id = a.round_id AND r.club_id = a.club_id
            ),
            active_members AS (
                SELECT cm.id, cm.club_id, cm.user_id
                FROM club_memberships cm
                JOIN filtered_clubs c ON c.id = cm.club_id
                WHERE cm.status = 'ACTIVE'
                  AND cm.joined_at <= :now
                  AND cm.ended_at IS NULL
            )
            """;

    /**
     * Aggregate rounds, applications and memberships separately.
     * Each aggregate produces at most one row per club before joining.
     */
    private static final String CLUB_DATA = FILTERED_DATA + """
            ,
            round_totals AS (
                SELECT club_id,
                       COUNT(*) AS round_count,
                       BOOL_OR(is_open) AS has_open_recruitment
                FROM filtered_rounds
                GROUP BY club_id
            ),
            application_totals AS (
                SELECT club_id,
                       COUNT(*) AS total_applications,
                       COUNT(*) FILTER (WHERE status = 'SUBMITTED')
                           AS submitted_count,
                       COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')
                           AS under_review_count,
                       COUNT(*) FILTER (WHERE status = 'ACCEPTED')
                           AS accepted_count,
                       COUNT(*) FILTER (WHERE status = 'REJECTED')
                           AS rejected_count,
                       COUNT(*) FILTER (WHERE status = 'CONFIRMED')
                           AS confirmed_count,
                       COUNT(*) FILTER (WHERE status = 'DECLINED')
                           AS declined_count,
                       COUNT(*) FILTER (WHERE status = 'WITHDRAWN')
                           AS withdrawn_count,
                       COUNT(*) FILTER (WHERE status = 'EXPIRED')
                           AS expired_count
                FROM filtered_applications
                GROUP BY club_id
            ),
            membership_totals AS (
                SELECT club_id, COUNT(*) AS active_member_count
                FROM active_members
                GROUP BY club_id
            ),
            club_metrics AS (
                SELECT
                    c.id AS club_id,
                    c.name AS club_name,
                    c.status AS club_status,
                    c.category_id,
                    c.category_name,
                    COALESCE(r.round_count, 0) AS round_count,
                    COALESCE(r.has_open_recruitment, false)
                        AS has_open_recruitment,
                    COALESCE(a.total_applications, 0)
                        AS total_applications,
                    COALESCE(a.submitted_count, 0) AS submitted_count,
                    COALESCE(a.under_review_count, 0)
                        AS under_review_count,
                    COALESCE(a.accepted_count, 0) AS accepted_count,
                    COALESCE(a.rejected_count, 0) AS rejected_count,
                    COALESCE(a.confirmed_count, 0) AS confirmed_count,
                    COALESCE(a.declined_count, 0) AS declined_count,
                    COALESCE(a.withdrawn_count, 0) AS withdrawn_count,
                    COALESCE(a.expired_count, 0) AS expired_count,
                    COALESCE(m.active_member_count, 0)
                        AS active_member_count
                FROM filtered_clubs c
                LEFT JOIN round_totals r ON r.club_id = c.id
                LEFT JOIN application_totals a ON a.club_id = c.id
                LEFT JOIN membership_totals m ON m.club_id = c.id
            )
            """;

    public SummaryMetrics summary(
            AdminDashboardFilter filter,
            Instant now) {

        String sql = FILTERED_DATA + """
                SELECT
                    (SELECT COUNT(*) FROM filtered_clubs)
                        AS total_clubs,
                    (SELECT COUNT(*) FROM filtered_clubs
                        WHERE status = 'ACTIVE')
                        AS active_clubs,
                    (SELECT COUNT(*) FROM filtered_clubs
                        WHERE status = 'INACTIVE')
                        AS inactive_clubs,
                    (SELECT COUNT(DISTINCT club_id)
                        FROM filtered_rounds WHERE is_open)
                        AS recruiting_clubs,
                    (SELECT COUNT(*) FROM filtered_rounds)
                        AS total_rounds,
                    (SELECT COUNT(*) FROM filtered_rounds WHERE is_open)
                        AS open_rounds,
                    (SELECT COUNT(*) FROM active_members)
                        AS active_memberships,
                    COUNT(*) AS total_applications,
                    COUNT(DISTINCT applicant_id) AS unique_applicants,
                    COUNT(*) FILTER (WHERE status = 'SUBMITTED')
                        AS submitted_count,
                    COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')
                        AS under_review_count,
                    COUNT(*) FILTER (WHERE status = 'ACCEPTED')
                        AS accepted_count,
                    COUNT(*) FILTER (WHERE status = 'REJECTED')
                        AS rejected_count,
                    COUNT(*) FILTER (WHERE status = 'CONFIRMED')
                        AS confirmed_count,
                    COUNT(*) FILTER (WHERE status = 'DECLINED')
                        AS declined_count,
                    COUNT(*) FILTER (WHERE status = 'WITHDRAWN')
                        AS withdrawn_count,
                    COUNT(*) FILTER (WHERE status = 'EXPIRED')
                        AS expired_count,
                    COALESCE(
                        ROUND(
                            100.0 * COUNT(*) FILTER (
                                WHERE results_visible
                                  AND status = 'CONFIRMED'
                            )
                            / NULLIF(
                                COUNT(*) FILTER (
                                    WHERE results_visible
                                      AND status IN (
                                          'ACCEPTED', 'CONFIRMED',
                                          'DECLINED', 'EXPIRED'
                                      )
                                ),
                                0
                            ),
                            2
                        ),
                        0.00
                    ) AS confirmation_rate
                FROM filtered_applications
                """;

        return jdbc.queryForObject(
                sql,
                parameters(filter, now),
                (rs, rowNum) -> {
                    var statuses = new LinkedHashMap<String, Long>();

                    for (String status : List.of(
                            "SUBMITTED", "UNDER_REVIEW",
                            "ACCEPTED", "REJECTED",
                            "CONFIRMED", "DECLINED",
                            "WITHDRAWN", "EXPIRED")) {

                        statuses.put(
                                status,
                                rs.getLong(
                                        status.toLowerCase(Locale.ROOT)
                                                + "_count"));
                    }

                    return new SummaryMetrics(
                            rs.getLong("total_clubs"),
                            rs.getLong("active_clubs"),
                            rs.getLong("inactive_clubs"),
                            rs.getLong("recruiting_clubs"),
                            rs.getLong("total_rounds"),
                            rs.getLong("open_rounds"),
                            rs.getLong("total_applications"),
                            rs.getLong("unique_applicants"),
                            rs.getLong("confirmed_count"),
                            rs.getLong("active_memberships"),
                            rs.getBigDecimal("confirmation_rate"),
                            Collections.unmodifiableMap(statuses));
                });
    }

    public List<CategoryStats> categoryBreakdown(
            AdminDashboardFilter filter,
            Instant now) {

        String sql = CLUB_DATA + """
                SELECT
                    category_id,
                    category_name,
                    COUNT(*) AS club_count,
                    SUM(round_count) AS total_rounds,
                    SUM(total_applications) AS total_applications,
                    SUM(
                        accepted_count + confirmed_count
                        + declined_count + expired_count
                    ) AS offered_count,
                    SUM(confirmed_count) AS confirmed_count,
                    SUM(active_member_count) AS active_member_count
                FROM club_metrics
                GROUP BY category_id, category_name
                ORDER BY category_name ASC, category_id ASC
                """;

        return jdbc.query(
                sql,
                parameters(filter, now),
                (rs, rowNum) -> new CategoryStats(
                        Long.toString(rs.getLong("category_id")),
                        rs.getString("category_name"),
                        rs.getLong("club_count"),
                        rs.getLong("total_rounds"),
                        rs.getLong("total_applications"),
                        rs.getLong("offered_count"),
                        rs.getLong("confirmed_count"),
                        rs.getLong("active_member_count")));
    }

    public List<TopClub> topClubs(
            AdminDashboardFilter filter,
            Instant now) {

        String sql = CLUB_DATA + """
                SELECT
                    club_id,
                    club_name,
                    category_name,
                    total_applications,
                    accepted_count + confirmed_count
                        + declined_count + expired_count AS offered_count,
                    confirmed_count,
                    active_member_count
                FROM club_metrics
                ORDER BY total_applications DESC, club_id ASC
                LIMIT 5
                """;

        return jdbc.query(
                sql,
                parameters(filter, now),
                (rs, rowNum) -> new TopClub(
                        Long.toString(rs.getLong("club_id")),
                        rs.getString("club_name"),
                        rs.getString("category_name"),
                        rs.getLong("total_applications"),
                        rs.getLong("offered_count"),
                        rs.getLong("confirmed_count"),
                        rs.getLong("active_member_count")));
    }

    public ClubStatsPage clubs(
            AdminDashboardFilter filter,
            Instant now,
            long total) {

        MapSqlParameterSource params = parameters(filter, now)
                .addValue("limit", filter.size(), Types.INTEGER)
                .addValue("offset", filter.offset(), Types.BIGINT);

        List<ClubStats> items = jdbc.query(
                CLUB_DATA + """
                        SELECT *
                        FROM club_metrics
                        ORDER BY club_name ASC, club_id ASC
                        LIMIT :limit OFFSET :offset
                        """,
                params,
                (rs, rowNum) -> mapClub(rs));

        long totalPages = total / filter.size()
                + (total % filter.size() == 0 ? 0 : 1);

        return new ClubStatsPage(
                items,
                new PublicPageMetadataDto(
                        filter.page(),
                        filter.size(),
                        total,
                        totalPages));
    }

    private ClubStats mapClub(ResultSet rs) throws SQLException {
        return new ClubStats(
                Long.toString(rs.getLong("club_id")),
                rs.getString("club_name"),
                new PublicClubCategoryDto(
                        Long.toString(rs.getLong("category_id")),
                        rs.getString("category_name")),
                rs.getString("club_status"),
                rs.getBoolean("has_open_recruitment"),
                rs.getLong("round_count"),
                rs.getLong("total_applications"),
                rs.getLong("submitted_count"),
                rs.getLong("under_review_count"),
                rs.getLong("accepted_count"),
                rs.getLong("rejected_count"),
                rs.getLong("confirmed_count"),
                rs.getLong("declined_count"),
                rs.getLong("withdrawn_count"),
                rs.getLong("expired_count"),
                rs.getLong("active_member_count"));
    }

    private MapSqlParameterSource parameters(
            AdminDashboardFilter filter,
            Instant now) {

        return new MapSqlParameterSource()
                .addValue(
                        "namePattern",
                        filter.namePattern(),
                        Types.VARCHAR)
                .addValue(
                        "categoryId",
                        filter.categoryId(),
                        Types.BIGINT)
                .addValue(
                        "academicYear",
                        filter.academicYear(),
                        Types.INTEGER)
                .addValue(
                        "semester",
                        filter.semester(),
                        Types.INTEGER)
                .addValue(
                        "clubStatus",
                        filter.clubStatus(),
                        Types.VARCHAR)
                .addValue(
                        "now",
                        OffsetDateTime.ofInstant(now, ZoneOffset.UTC),
                        Types.TIMESTAMP_WITH_TIMEZONE);
    }
}