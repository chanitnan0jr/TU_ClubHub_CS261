package com.tu.clubhub.dashboard.dto;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record AdminDashboardFilter(
        String q,
        Long categoryId,
        Integer academicYear,
        Integer semester,
        String clubStatus,
        int page,
        int size) {

    public AdminDashboardFilter {
        q = q == null ? null : q.strip();

        if (q != null && q.isEmpty()) {
            q = null;
        }

        if (q != null && q.length() > 200) {
            throw invalid("q must not exceed 200 characters");
        }

        if (categoryId != null && categoryId <= 0) {
            throw invalid("categoryId must be positive");
        }

        if (academicYear != null
                && (academicYear < 1 || academicYear > 32767)) {
            throw invalid("academicYear must be between 1 and 32767");
        }

        if (semester != null && (semester < 1 || semester > 3)) {
            throw invalid("semester must be between 1 and 3");
        }

        clubStatus = clubStatus == null ? "ALL" : clubStatus;

        if (!"ALL".equals(clubStatus)
                && !"ACTIVE".equals(clubStatus)
                && !"INACTIVE".equals(clubStatus)) {
            throw invalid("clubStatus must be ALL, ACTIVE or INACTIVE");
        }

        if (page < 0) {
            throw invalid("page must be non-negative");
        }

        if (size < 1 || size > 100) {
            throw invalid("size must be between 1 and 100");
        }
    }

    public long offset() {
        return (long) page * size;
    }

    /**
     * Escape SQL LIKE metacharacters so searching for % or _
     * treats them as literal characters.
     */
    public String namePattern() {
        if (q == null) {
            return null;
        }

        return "%"
                + q.replace("\\", "\\\\")
                   .replace("%", "\\%")
                   .replace("_", "\\_")
                + "%";
    }

    public AdminDashboardStatsResponse.AppliedFilters appliedFilters() {
        return new AdminDashboardStatsResponse.AppliedFilters(
                academicYear,
                semester,
                categoryId == null ? null : categoryId.toString(),
                clubStatus);
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST, message);
    }
}