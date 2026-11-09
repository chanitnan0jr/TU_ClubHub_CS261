package com.tu.clubhub.application;

import com.tu.clubhub.application.dto.ApplicantApplicationPage.VisibleStatus;
import com.tu.clubhub.application.repository.MyApplicationRepository;
import com.tu.clubhub.application.repository.MyApplicationRepository.ApplicationRow;
import com.tu.clubhub.application.service.MyApplicationService;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.user.repository.UserAccountRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MyApplicationServiceTest {

    private static final long USER_ID = 30L;
    private static final Instant NOW =
            Instant.parse("2026-11-02T12:00:00Z");

    private MyApplicationRepository repository;
    private UserAccountRepository accounts;
    private MyApplicationService service;

    @BeforeEach
    void setUp() {
        repository = mock(MyApplicationRepository.class);
        accounts = mock(UserAccountRepository.class);

        service = new MyApplicationService(
                repository,
                accounts,
                Clock.fixed(NOW, ZoneOffset.UTC));

        var principal = new ClubHubPrincipal(
                USER_ID, "test-student", "USER");

        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, List.of()));
        SecurityContextHolder.setContext(context);

        when(accounts.findAccountStatusById(USER_ID))
                .thenReturn(Optional.of("ACTIVE"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listUsesSessionUserAndRequestedPagination() {
        when(repository.countByApplicant(USER_ID)).thenReturn(3L);
        when(repository.findByApplicant(USER_ID, 2, 2L))
                .thenReturn(List.of(row(
                        "SUBMITTED", null, NOW.plusSeconds(3600),
                        "ACTIVE", "ACTIVE")));

        var result = service.list(1, 2);

        assertEquals(1, result.items().size());
        assertEquals(1, result.page().number());
        assertEquals(2, result.page().size());
        assertEquals(3L, result.page().totalElements());
        assertEquals(2, result.page().totalPages());

        verify(repository).countByApplicant(USER_ID);
        verify(repository).findByApplicant(USER_ID, 2, 2L);
    }

    @Test
    void unpublishedInternalStatusesAreMasked() {
        for (String internalStatus : List.of(
                "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED")) {

            var row = row(
                    internalStatus, null, NOW.plusSeconds(3600),
                    "ACTIVE", "ACTIVE");

            when(repository.findOwnedById(10L, USER_ID))
                    .thenReturn(Optional.of(row));
            when(repository.findOwnedQuestionAnswers(10L, USER_ID))
                    .thenReturn(List.of());
            when(repository.findOwnedLinks(10L, USER_ID))
                    .thenReturn(List.of());

            var result = service.detail("10");

            assertEquals(
                    VisibleStatus.SUBMITTED,
                    result.applicantVisibleStatus(),
                    internalStatus);
            assertEquals("รอพิจารณา", result.displayStatusLabel());
            assertNull(result.resultMessage());
            assertNull(result.round().resultsPublishedAt());
            assertNull(result.round().confirmationDeadline());
            assertNull(result.respondedAt());
            assertFalse(result.canConfirm());
            assertFalse(result.canDecline());

            assertEquals(1, result.statusHistory().size());
            assertEquals(
                    VisibleStatus.SUBMITTED,
                    result.statusHistory().getFirst().status());
            assertEquals(
                    "ส่งใบสมัครแล้ว",
                    result.statusHistory().getFirst().displayStatusLabel());
        }
    }

    @Test
    void anotherUsersApplicationReturns403WithoutReadingAnswers() {
        when(repository.findOwnedById(10L, USER_ID))
                .thenReturn(Optional.empty());
        when(repository.existsById(10L)).thenReturn(true);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.detail("10"));

        assertEquals(403, error.getStatusCode().value());

        verify(repository, never())
                .findOwnedQuestionAnswers(anyLong(), anyLong());
        verify(repository, never())
                .findOwnedLinks(anyLong(), anyLong());
    }

    @Test
    void missingApplicationReturns404() {
        when(repository.findOwnedById(10L, USER_ID))
                .thenReturn(Optional.empty());
        when(repository.existsById(10L)).thenReturn(false);

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.detail("10"));

        assertEquals(404, error.getStatusCode().value());
    }

    @Test
    void offerExpiresExactlyAtConfirmationDeadline() {
        var row = row(
                "ACCEPTED", NOW.minusSeconds(60), NOW,
                "ACTIVE", "ACTIVE");

        when(repository.findOwnedById(10L, USER_ID))
                .thenReturn(Optional.of(row));
        when(repository.findOwnedQuestionAnswers(10L, USER_ID))
                .thenReturn(List.of());
        when(repository.findOwnedLinks(10L, USER_ID))
                .thenReturn(List.of());

        var result = service.detail("10");

        assertEquals(
                VisibleStatus.EXPIRED,
                result.applicantVisibleStatus());
        assertFalse(result.canConfirm());
        assertFalse(result.canDecline());

        assertEquals(
                List.of(
                        VisibleStatus.SUBMITTED,
                        VisibleStatus.ACCEPTED_PENDING_CONFIRMATION,
                        VisibleStatus.EXPIRED),
                result.statusHistory().stream()
                        .map(entry -> entry.status())
                        .toList());

        assertEquals(
                NOW,
                result.statusHistory().getLast().occurredAt());
    }

    @Test
    void inactiveStudentAndClubCanReadHistoryButCannotConfirm() {
        when(repository.countByApplicant(USER_ID)).thenReturn(1L);
        when(repository.findByApplicant(USER_ID, 20, 0L))
                .thenReturn(List.of(row(
                        "ACCEPTED",
                        NOW.minusSeconds(60),
                        NOW.plusSeconds(3600),
                        "INACTIVE",
                        "INACTIVE")));

        var result = service.list(0, 20).items().getFirst();

        assertEquals(
                VisibleStatus.ACCEPTED_PENDING_CONFIRMATION,
                result.applicantVisibleStatus());
        assertFalse(result.canConfirm());
        assertTrue(result.canDecline());
    }

    @Test
    void anonymousUserCannotReadApplications() {
        SecurityContextHolder.clearContext();

        var error = assertThrows(
                ResponseStatusException.class,
                () -> service.list(0, 20));

        assertEquals(401, error.getStatusCode().value());
        verifyNoInteractions(repository, accounts);
    }

    @Test
    void invalidPaginationDoesNotQueryApplications() {
        for (int[] input : new int[][]{
                {-1, 20},
                {0, 0},
                {0, 101}
        }) {
            var error = assertThrows(
                    ResponseStatusException.class,
                    () -> service.list(input[0], input[1]));

            assertEquals(400, error.getStatusCode().value());
        }

        verifyNoInteractions(repository);
    }

    private ApplicationRow row(
            String status,
            Instant publishedAt,
            Instant deadline,
            String studentStatus,
            String clubStatus) {

        return new ApplicationRow(
                10L,
                USER_ID,
                20L,
                "Test club",
                null,
                clubStatus,
                studentStatus,
                40L,
                "Test round",
                2569,
                1,
                NOW.minusSeconds(7200),
                NOW.minusSeconds(3600),
                publishedAt,
                deadline,
                "PUBLISHED",
                status,
                NOW.minusSeconds(5400),
                null,
                NOW.minusSeconds(5400),
                "Original motivation",
                "Selection result");
    }
}