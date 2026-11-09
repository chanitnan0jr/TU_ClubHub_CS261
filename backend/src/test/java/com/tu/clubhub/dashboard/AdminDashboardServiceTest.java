package com.tu.clubhub.dashboard;

import com.tu.clubhub.dashboard.dto.AdminDashboardFilter;
import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse;
import com.tu.clubhub.dashboard.repository.AdminDashboardRepository;
import com.tu.clubhub.dashboard.security.AdminAccessService;
import com.tu.clubhub.dashboard.service.AdminDashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminDashboardServiceTest {

    private static final Instant NOW =
            Instant.parse("2026-11-09T12:00:00Z");

    private AdminAccessService access;
    private AdminDashboardRepository repository;
    private AdminDashboardService service;

    @BeforeEach
    void setUp() {
        access = mock(AdminAccessService.class);
        repository = mock(AdminDashboardRepository.class);

        service = new AdminDashboardService(
                access,
                repository,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void authorizedRequestUsesSameFiltersAndTimeForEveryQuery() {
        when(access.requireAdmin()).thenReturn(100L);

        var filter = new AdminDashboardFilter(
                "Music", 2L, 2569, 1, "ACTIVE", 0, 20);

        var summary = mock(
                AdminDashboardStatsResponse.SummaryMetrics.class);

        var clubs = new AdminDashboardStatsResponse.ClubStatsPage(
                List.of(),
                new AdminDashboardStatsResponse.PageMetadata(
                        0, 20, 0, 0));

        when(repository.summary(filter, NOW)).thenReturn(summary);
        when(repository.categoryBreakdown(filter, NOW))
                .thenReturn(List.of());
        when(repository.topClubs(filter, NOW)).thenReturn(List.of());
        when(repository.clubs(filter, NOW)).thenReturn(clubs);

        var result = service.stats(
                "  Music  ", 2L, 2569, 1, "ACTIVE", 0, 20);

        assertEquals(NOW, result.generatedAt());
        assertEquals(filter.appliedFilters(), result.filters());
        assertSame(summary, result.summary());
        assertSame(clubs, result.clubs());

        var order = inOrder(access, repository);
        order.verify(access).requireAdmin();
        order.verify(repository).summary(filter, NOW);
        order.verify(repository).categoryBreakdown(filter, NOW);
        order.verify(repository).topClubs(filter, NOW);
        order.verify(repository).clubs(filter, NOW);

        verifyNoMoreInteractions(repository);
    }

    @Test
    void nonAdminCannotQueryStatisticsEvenWithInvalidFilters() {
        when(access.requireAdmin()).thenThrow(
                new AccessDeniedException("Admin required"));

        assertThrows(
                AccessDeniedException.class,
                () -> service.stats(
                        null, null, null, null, "ALL", -1, 0));

        verifyNoInteractions(repository);
    }

    @Test
    void unauthenticatedRequestCannotQueryStatistics() {
        when(access.requireAdmin()).thenThrow(
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED));

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.stats(
                        null, null, null, null, "ALL", 0, 20));

        assertEquals(401, error.getStatusCode().value());
        verifyNoInteractions(repository);
    }

    @Test
    void invalidFiltersAreRejectedBeforeAggregation() {
        when(access.requireAdmin()).thenReturn(100L);

        List<Runnable> invalidRequests = List.of(
                () -> service.stats(
                        "x".repeat(201),
                        null, null, null, "ALL", 0, 20),

                () -> service.stats(
                        null, 0L, null, null, "ALL", 0, 20),

                () -> service.stats(
                        null, null, 0, null, "ALL", 0, 20),

                () -> service.stats(
                        null, null, 32768, null, "ALL", 0, 20),

                () -> service.stats(
                        null, null, null, 0, "ALL", 0, 20),

                () -> service.stats(
                        null, null, null, 4, "ALL", 0, 20),

                () -> service.stats(
                        null, null, null, null, "UNKNOWN", 0, 20),

                () -> service.stats(
                        null, null, null, null, "ALL", -1, 20),

                () -> service.stats(
                        null, null, null, null, "ALL", 0, 0),

                () -> service.stats(
                        null, null, null, null, "ALL", 0, 101)
        );

        for (Runnable request : invalidRequests) {
            var error = assertThrows(
                    ResponseStatusException.class,
                    request::run);

            assertEquals(400, error.getStatusCode().value());
        }

        verifyNoInteractions(repository);
    }

    @Test
    void filterEscapesSearchWildcardsAndUsesLongOffset() {
        var filter = new AdminDashboardFilter(
                "  50%_\\Club  ",
                null,
                null,
                null,
                null,
                Integer.MAX_VALUE,
                100);

        assertEquals("50%_\\Club", filter.q());
        assertEquals("%50\\%\\_\\\\Club%", filter.namePattern());
        assertEquals("ALL", filter.clubStatus());
        assertEquals(214748364700L, filter.offset());

        var blank = new AdminDashboardFilter(
                "   ", null, null, null, "ALL", 0, 20);

        assertNull(blank.q());
        assertNull(blank.namePattern());
    }
}