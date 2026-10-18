package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import com.tu.clubhub.recruitment.repository.RecruitmentRoundRepository;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecruitmentRoundServiceTest {

    private static final Instant NOW =
            Instant.parse("2026-10-18T12:00:00Z");

    private RecruitmentRoundRepository repository;
    private ClubSecurity security;
    private RecruitmentRoundService service;

    @BeforeEach
    void setUp() {
        repository = mock(RecruitmentRoundRepository.class);
        security = mock(ClubSecurity.class);

        service = new RecruitmentRoundService(
                repository,
                security,
                Clock.fixed(NOW, ZoneOffset.UTC),
                mock(Validator.class));
    }

    @Test
    void nonCommitteeCannotCloseRound() {
        when(security.isCommittee(1L)).thenReturn(false);

        assertThrows(
                AccessDeniedException.class,
                () -> service.closeRound(1L, 10L, 0L));

        verifyNoInteractions(repository);
    }

    @Test
    void roundFromAnotherClubIsNotFound() {
        when(security.isCommittee(1L)).thenReturn(true);
        when(repository.findForUpdate(1L, 10L))
                .thenReturn(Optional.empty());

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.closeRound(1L, 10L, 0L));

        assertEquals(404, error.getStatusCode().value());

        verify(repository, never()).closeRound(
                any(), any(), any(), any());
    }

    @Test
    void roundCannotCloseBeforeOpening() {
        when(security.isCommittee(1L)).thenReturn(true);
        when(repository.findForUpdate(1L, 10L))
                .thenReturn(Optional.of(round(
                        NOW.plusSeconds(60),
                        NOW.plusSeconds(3600),
                        null,
                        0L)));

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.closeRound(1L, 10L, 0L));

        assertEquals(409, error.getStatusCode().value());

        verify(repository, never()).closeRound(
                any(), any(), any(), any());
    }

    @Test
    void roundCannotCloseAtScheduledClosingTime() {
        when(security.isCommittee(1L)).thenReturn(true);
        when(repository.findForUpdate(1L, 10L))
                .thenReturn(Optional.of(round(
                        NOW.minusSeconds(3600),
                        NOW,
                        null,
                        0L)));

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.closeRound(1L, 10L, 0L));

        assertEquals(409, error.getStatusCode().value());

        verify(repository, never()).closeRound(
                any(), any(), any(), any());
    }

    @Test
    void staleVersionCannotCloseRound() {
        when(security.isCommittee(1L)).thenReturn(true);
        when(repository.findForUpdate(1L, 10L))
                .thenReturn(Optional.of(round(
                        NOW.minusSeconds(60),
                        NOW.plusSeconds(3600),
                        null,
                        1L)));

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.closeRound(1L, 10L, 0L));

        assertEquals(409, error.getStatusCode().value());

        verify(repository, never()).closeRound(
                any(), any(), any(), any());
    }

    @Test
    void activePublishedRoundCanClose() {
        when(security.isCommittee(1L)).thenReturn(true);

        RecruitmentRound before = round(
                NOW.minusSeconds(60),
                NOW.plusSeconds(3600),
                null,
                0L);

        RecruitmentRound after = round(
                before.opensAt(),
                before.closesAt(),
                NOW,
                1L);

        when(repository.findForUpdate(1L, 10L))
                .thenReturn(
                        Optional.of(before),
                        Optional.of(after));

        when(repository.closeRound(1L, 10L, 0L, NOW))
                .thenReturn(1);

        RecruitmentRound result =
                service.closeRound(1L, 10L, 0L);

        assertEquals(NOW, result.closedAt());
        assertEquals(1L, result.version().longValue());

        verify(repository).closeRound(1L, 10L, 0L, NOW);
    }

    @Test
    void invalidTimelineIsRejectedAndValidTimelinePasses() {
        when(security.isCommittee(1L)).thenReturn(true);

        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var dateService = new RecruitmentRoundService(
                    repository,
                    security,
                    Clock.fixed(NOW, ZoneOffset.UTC),
                    factory.getValidator());

            OffsetDateTime opensAt =
                    NOW.atOffset(ZoneOffset.UTC);

            OffsetDateTime closesAt = opensAt.plusHours(1);
            OffsetDateTime deadline = closesAt.plusDays(1);

            // ช่วงเวลาถูกต้อง
            assertDoesNotThrow(() -> dateService.validateDates(
                    1L,
                    request(opensAt, closesAt, deadline, null)));

            // วันปิดเท่ากับวันเปิด
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(opensAt, opensAt, deadline, null)));

            // วันปิดก่อนวันเปิด
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(
                                    opensAt,
                                    opensAt.minusHours(1),
                                    deadline,
                                    null)));

            // วันยืนยันสิทธิ์เท่ากับวันปิด
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(
                                    opensAt,
                                    closesAt,
                                    closesAt,
                                    null)));

            // เวลาประกาศผลก่อนวันเปิด
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(
                                    opensAt,
                                    closesAt,
                                    deadline,
                                    opensAt.minusSeconds(1))));

            // เวลาประกาศผลตรงเส้นตาย
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(
                                    opensAt,
                                    closesAt,
                                    deadline,
                                    deadline)));

            // ไม่ส่งวันเปิด
            assertThrows(
                    ConstraintViolationException.class,
                    () -> dateService.validateDates(
                            1L,
                            request(
                                    null,
                                    closesAt,
                                    deadline,
                                    null)));
        }

        verifyNoInteractions(repository);
    }

    private RecruitmentRound round(
            Instant opensAt,
            Instant closesAt,
            Instant closedAt,
            Long version) {

        return new RecruitmentRound(
                10L,
                1L,
                "Test round",
                2569,
                1,
                "Description",
                null,
                opensAt,
                closesAt,
                closedAt,
                null,
                closesAt.plusSeconds(86400),
                "PUBLISHED",
                opensAt.minusSeconds(60),
                null,
                100L,
                opensAt.minusSeconds(120),
                NOW,
                version);
    }

    private RoundWriteRequest request(
            OffsetDateTime opensAt,
            OffsetDateTime closesAt,
            OffsetDateTime deadline,
            OffsetDateTime resultsAt) {

        return new RoundWriteRequest(
                "Test round",
                2569,
                1,
                "Description",
                null,
                opensAt,
                closesAt,
                deadline,
                resultsAt,
                List.of(),
                null);
    }
}