package com.tu.clubhub.dashboard.dto;

import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record AdminDashboardStatsResponse(
        Instant generatedAt,
        AppliedFilters filters,
        SummaryMetrics summary,
        List<CategoryStats> categoryBreakdown,
        List<TopClub> topClubs,
        ClubStatsPage clubs) {

    public record AppliedFilters(
            Integer academicYear,
            Integer semester,
            String categoryId,
            String clubStatus) {
    }

    public record SummaryMetrics(
            long totalClubs,
            long activeClubs,
            long inactiveClubs,
            long clubsCurrentlyRecruiting,
            long totalRecruitmentRounds,
            long openRecruitmentRounds,
            long totalApplications,
            long uniqueApplicants,
            long confirmedNewMembers,
            long currentActiveMemberships,
            BigDecimal confirmationRatePercent,
            Map<String, Long> statusBreakdown) {
    }

    public record CategoryStats(
            String categoryId,
            String categoryName,
            long clubCount,
            long totalRounds,
            long totalApplications,
            long acceptedCount,
            long confirmedCount,
            long activeMemberCount) {
    }

    public record TopClub(
            String clubId,
            String clubName,
            String categoryName,
            long totalApplications,
            long acceptedCount,
            long confirmedCount,
            long activeMemberCount) {
    }

    public record ClubStats(
            String clubId,
            String clubName,
            PublicClubCategoryDto category,
            String clubStatus,
            boolean hasOpenRecruitment,
            long roundCount,
            long totalApplications,
            long submittedCount,
            long underReviewCount,
            long acceptedCount,
            long rejectedCount,
            long confirmedCount,
            long declinedCount,
            long withdrawnCount,
            long expiredCount,
            long activeMemberCount) {
    }

    public record ClubStatsPage(
            List<ClubStats> items,
            PublicPageMetadataDto page) {
    }
}