package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.RoundResponse;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import com.tu.clubhub.recruitment.repository.RecruitmentRoundRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Fixed-clock regression tests for recruitment lifecycle and authorization. */
class RecruitmentRoundLifecycleEdgeCasesTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private static final long CLUB = 1L;
    private static final long ROUND = 10L;
    private static final long COMMITTEE_USER = 100L;

    private RecruitmentRoundRepository repository;
    private ClubSecurity clubSecurity;
    private ValidatorFactory validatorFactory;
    private RecruitmentRoundService service;

    @BeforeEach
    void setUp() {
        repository = mock(RecruitmentRoundRepository.class);
        clubSecurity = mock(ClubSecurity.class);
        validatorFactory = Validation.buildDefaultValidatorFactory();
        service = new RecruitmentRoundService(
                repository,
                clubSecurity,
                Clock.fixed(NOW, ZoneOffset.UTC),
                validatorFactory.getValidator());
        when(clubSecurity.isCommittee(CLUB)).thenReturn(true);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        new ClubHubPrincipal(COMMITTEE_USER, "committee", "USER"),
                        null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        validatorFactory.close();
    }

    @Test
    void publishJustBeforeScheduledCloseSucceeds() {
        RecruitmentRound before = round("DRAFT", NOW.minusSeconds(3600),
                NOW.plusSeconds(1), null, 0L);
        RecruitmentRound after = round("PUBLISHED", before.opensAt(),
                before.closesAt(), null, 1L);
        when(repository.findForUpdate(CLUB, ROUND))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        when(repository.publishRound(CLUB, ROUND, 0L, NOW)).thenReturn(1);

        RoundResponse result = service.publishRound(CLUB, ROUND, 0L);

        assertEquals("PUBLISHED", result.publicationStatus());
        verify(repository).publishRound(CLUB, ROUND, 0L, NOW);
    }

    @Test
    void publishingAtClosingBoundaryReturnsConflictWithoutWrite() {
        when(repository.findForUpdate(CLUB, ROUND)).thenReturn(Optional.of(
                round("DRAFT", NOW.minusSeconds(3600), NOW, null, 0L)));

        assertStatus(409, () -> service.publishRound(CLUB, ROUND, 0L));
        verify(repository, never()).publishRound(any(), any(), any(), any());
    }

    @Test
    void publishingAlreadyPublishedRoundReturnsConflict() {
        when(repository.findForUpdate(CLUB, ROUND)).thenReturn(Optional.of(
                round("PUBLISHED", NOW.minusSeconds(60), NOW.plusSeconds(60), null, 0L)));

        assertStatus(409, () -> service.publishRound(CLUB, ROUND, 0L));
        verify(repository, never()).publishRound(any(), any(), any(), any());
    }

    @Test
    void closingExactlyAtOpeningBoundaryIsAllowed() {
        RecruitmentRound before = round("PUBLISHED", NOW,
                NOW.plusSeconds(3600), null, 0L);
        RecruitmentRound after = round("PUBLISHED", NOW,
                NOW.plusSeconds(3600), NOW, 1L);
        when(repository.findForUpdate(CLUB, ROUND))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        when(repository.closeRound(CLUB, ROUND, 0L, NOW)).thenReturn(1);

        assertEquals(NOW, service.closeRound(CLUB, ROUND, 0L).closedAt());
        verify(repository).closeRound(CLUB, ROUND, 0L, NOW);
    }

    @Test
    void closingAlreadyManuallyClosedRoundReturnsConflict() {
        when(repository.findForUpdate(CLUB, ROUND)).thenReturn(Optional.of(
                round("PUBLISHED", NOW.minusSeconds(3600),
                        NOW.plusSeconds(3600), NOW.minusSeconds(20), 1L)));

        assertStatus(409, () -> service.closeRound(CLUB, ROUND, 1L));
        verify(repository, never()).closeRound(any(), any(), any(), any());
    }

    @Test
    void closeLostOptimisticLockReturnsConflict() {
        when(repository.findForUpdate(CLUB, ROUND)).thenReturn(Optional.of(
                round("PUBLISHED", NOW.minusSeconds(60),
                        NOW.plusSeconds(3600), null, 0L)));
        when(repository.closeRound(CLUB, ROUND, 0L, NOW)).thenReturn(0);

        assertStatus(409, () -> service.closeRound(CLUB, ROUND, 0L));
    }

    @Test
    void staleVersionCannotPublish() {
        when(repository.findForUpdate(CLUB, ROUND)).thenReturn(Optional.of(
                round("DRAFT", NOW.minusSeconds(60),
                        NOW.plusSeconds(3600), null, 2L)));

        assertStatus(409, () -> service.publishRound(CLUB, ROUND, 1L));
        verify(repository, never()).publishRound(any(), any(), any(), any());
    }

    @Test
    void unauthorizedUserCannotCreateUpdatePublishOrCloseRounds() {
        when(clubSecurity.isCommittee(CLUB)).thenReturn(false);
        RoundWriteRequest valid = request(
                NOW, NOW.plusSeconds(60), NOW.plusSeconds(120));

        assertThrows(AccessDeniedException.class, () -> service.createRound(CLUB, valid));
        assertThrows(AccessDeniedException.class, () -> service.updateRound(CLUB, ROUND, valid));
        assertThrows(AccessDeniedException.class, () -> service.publishRound(CLUB, ROUND, 0L));
        assertThrows(AccessDeniedException.class, () -> service.closeRound(CLUB, ROUND, 0L));
        verifyNoInteractions(repository);
    }

    @Test
    void timeComparisonUsesActualInstantAcrossUtcOffsets() {
        // 12:00 UTC and 19:00 +07:00 are the same instant, not an open interval.
        OffsetDateTime opening = NOW.atOffset(ZoneOffset.UTC);
        OffsetDateTime equalClosing = NOW.atOffset(ZoneOffset.ofHours(7));
        RoundWriteRequest invalid = new RoundWriteRequest(
                "Round", 2569, 1, "Description", null,
                opening, equalClosing, opening.plusDays(1),
                null, List.of(), null);

        assertThrows(jakarta.validation.ConstraintViolationException.class,
                () -> service.validateDates(CLUB, invalid));
        verifyNoInteractions(repository);
    }

    private static RoundWriteRequest request(Instant opens, Instant closes, Instant deadline) {
        return new RoundWriteRequest("Round", 2569, 1, "Description", null,
                opens.atOffset(ZoneOffset.UTC), closes.atOffset(ZoneOffset.UTC),
                deadline.atOffset(ZoneOffset.UTC), null, List.of(), null);
    }

    private static RecruitmentRound round(String status, Instant opens,
                                           Instant closes, Instant closed, long version) {
        return new RecruitmentRound(
                ROUND, CLUB, "Round", 2569, 1, "Description", null,
                opens, closes, closed, null, closes.plusSeconds(3600),
                status, "PUBLISHED".equals(status) ? opens.minusSeconds(60) : null,
                null, 100L, opens.minusSeconds(3600), NOW, version);
    }

    private static void assertStatus(int status, org.junit.jupiter.api.function.Executable action) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, action);
        assertEquals(status, error.getStatusCode().value());
    }
}
