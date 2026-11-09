package com.tu.clubhub.dashboard.service;

import com.tu.clubhub.dashboard.dto.AdminDashboardFilter;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse;
import com.tu.clubhub.dashboard.repository.AdminDashboardRepository;
import com.tu.clubhub.dashboard.security.AdminAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Service
public class AdminDashboardService {

    private final AdminAccessService access;
    private final AdminDashboardRepository repository;
    private final Clock clock;

    public AdminDashboardService(
            AdminAccessService access,
            AdminDashboardRepository repository,
            Clock clock) {

        this.access = access;
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ)
    public AdminDashboardStatsResponse stats(
            String q,
            Long categoryId,
            Integer academicYear,
            Integer semester,
            String clubStatus,
            int page,
            int size) {

        // Check current database permissions before querying statistics.
        access.requireAdmin();

        var filter = new AdminDashboardFilter(
                q,
                categoryId,
                academicYear,
                semester,
                clubStatus,
                page,
                size);

        // All metrics use the same time and database snapshot.
        Instant now = clock.instant();
        var summary = repository.summary(filter, now);

        return new AdminDashboardStatsResponse(
                now,
                filter.appliedFilters(),
                summary,
                repository.categoryBreakdown(filter, now),
                repository.topClubs(filter, now),
                repository.clubs(filter, now, summary.totalClubs()));
    }
}