package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.Question;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.RoundScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
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

/** Isolated business-rule tests; no PostgreSQL or Spring application context is required. */
class ApplicationQuestionServiceTest {

    private static final long ROUND_ID = 10L;
    private static final long CLUB_ID = 20L;
    private static final long USER_ID = 30L;
    private static final long QUESTION_ID = 40L;

    private ApplicationQuestionRepository repository;
    private ClubSecurity clubSecurity;
    private ApplicationQuestionService service;

    @BeforeEach
    void setUp() {
        repository = mock(ApplicationQuestionRepository.class);
        clubSecurity = mock(ClubSecurity.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-19T12:00:00Z"), ZoneOffset.UTC);
        service = new ApplicationQuestionService(repository, clubSecurity, clock);

        // Service deliberately reads the authenticated ClubHub principal itself.
        ClubHubPrincipal principal = mock(ClubHubPrincipal.class);
        when(principal.userId()).thenReturn(USER_ID);
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(principal);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void allowDraftWrite() {
        when(repository.lockRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(ROUND_ID, CLUB_ID, "DRAFT", false, 0L)));
        when(clubSecurity.isCommittee(CLUB_ID)).thenReturn(true);
    }

    private void allowRead() {
        when(repository.findRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(ROUND_ID, CLUB_ID, "DRAFT", false, 0L)));
        when(clubSecurity.isCommittee(CLUB_ID)).thenReturn(true);
    }

    @Test
    void listingReturnsQuestionsInRepositoryOrderWithStringIds() {
        allowRead();
        when(repository.findAllByRound(ROUND_ID)).thenReturn(List.of(
                new Question(QUESTION_ID, ROUND_ID, "Why join?", true, 1),
                new Question(41L, ROUND_ID, "What experience?", false, 2)));

        var result = service.listQuestions(ROUND_ID);

        assertEquals(2, result.items().size());
        assertEquals("40", result.items().get(0).id());
        assertEquals("10", result.items().get(0).roundId());
        assertEquals(2, result.items().get(1).displayOrder());
    }

    @Test
    void anonymousUserCannotReadQuestions() {
        SecurityContextHolder.clearContext();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listQuestions(ROUND_ID));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void missingRoundIsNotFound() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listQuestions(ROUND_ID));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void aCommitteeMemberOfAnotherClubCannotReadTheRound() {
        when(repository.findRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(ROUND_ID, CLUB_ID, "DRAFT", false, 0L)));

        assertThrows(AccessDeniedException.class, () -> service.listQuestions(ROUND_ID));
        verify(repository, never()).findAllByRound(anyLong());
    }

    @Test
    void anApplicantCannotReadRoundAsCommitteeEvenIfTheyWithdrew() {
        allowRead();
        when(repository.hasApplicationByApplicant(ROUND_ID, USER_ID)).thenReturn(true);

        assertThrows(AccessDeniedException.class, () -> service.listQuestions(ROUND_ID));
        verify(repository, never()).findAllByRound(anyLong());
    }

    @Test
    void cannotCreateBlankQuestionText() {
        allowDraftWrite();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(ROUND_ID, "  \t  ", true));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(repository, never()).insert(anyLong(), anyString(), anyBoolean());
    }

    @Test
    void cannotCreateQuestionWithoutRequiredFlag() {
        allowDraftWrite();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(ROUND_ID, "Why join?", null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(repository, never()).insert(anyLong(), anyString(), anyBoolean());
    }

    @Test
    void createsQuestionWithTrimmedTextAndBumpsRoundVersion() {
        allowDraftWrite();
        when(repository.insert(ROUND_ID, "Why join?", true)).thenReturn(QUESTION_ID);
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(QUESTION_ID, ROUND_ID, "Why join?", true, 1)));
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);

        var result = service.createQuestion(ROUND_ID, "  Why join?  ", true);

        assertEquals("40", result.id());
        assertEquals("Why join?", result.questionText());
        assertTrue(result.isRequired());
        verify(repository).insert(ROUND_ID, "Why join?", true);
        verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }

    @Test
    void publishedRoundsCannotBeEdited() {
        when(repository.lockRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(ROUND_ID, CLUB_ID, "PUBLISHED", false, 0L)));
        when(clubSecurity.isCommittee(CLUB_ID)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(ROUND_ID, "Why join?", true));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).insert(anyLong(), anyString(), anyBoolean());
    }

    @Test
    void roundsWithAnyApplicationCannotBeEdited() {
        allowDraftWrite();
        when(repository.hasApplications(ROUND_ID)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createQuestion(ROUND_ID, "Why join?", true));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).insert(anyLong(), anyString(), anyBoolean());
    }

    @Test
    void editingQuestionFromAnotherRoundReturnsNotFound() {
        allowDraftWrite();
        // findByIdAndRound intentionally returns empty: prevents cross-round IDOR.
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.updateQuestion(ROUND_ID, QUESTION_ID, "Changed", false));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(repository, never()).update(anyLong(), anyLong(), anyString(), anyBoolean());
    }

    @Test
    void updatesQuestionAndBumpsVersion() {
        allowDraftWrite();
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(QUESTION_ID, ROUND_ID, "Updated", false, 1)));
        when(repository.update(ROUND_ID, QUESTION_ID, "Updated", false)).thenReturn(1);
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);

        var result = service.updateQuestion(ROUND_ID, QUESTION_ID, " Updated ", false);

        assertEquals("Updated", result.questionText());
        assertFalse(result.isRequired());
        verify(repository).update(ROUND_ID, QUESTION_ID, "Updated", false);
    }

    @Test
    void cannotDeleteQuestionThatHasAnswers() {
        allowDraftWrite();
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(QUESTION_ID, ROUND_ID, "Answered", true, 1)));
        when(repository.hasAnswers(ROUND_ID, QUESTION_ID)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deleteQuestion(ROUND_ID, QUESTION_ID));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).delete(anyLong(), anyLong());
    }

    @Test
    void foreignKeyRaceDuringDeletionBecomesConflict() {
        allowDraftWrite();
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(QUESTION_ID, ROUND_ID, "Answered", true, 1)));
        when(repository.delete(ROUND_ID, QUESTION_ID))
                .thenThrow(new DataIntegrityViolationException("referenced by answer"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deleteQuestion(ROUND_ID, QUESTION_ID));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(repository, never()).compactDisplayOrder(anyLong());
    }

    @Test
    void successfulDeleteCompactsOrderAndBumpsVersion() {
        allowDraftWrite();
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(QUESTION_ID, ROUND_ID, "Delete", true, 1)));
        when(repository.delete(ROUND_ID, QUESTION_ID)).thenReturn(1);
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);

        service.deleteQuestion(ROUND_ID, QUESTION_ID);

        var order = inOrder(repository);
        order.verify(repository).delete(ROUND_ID, QUESTION_ID);
        order.verify(repository).compactDisplayOrder(ROUND_ID);
        order.verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }

    @Test
    void invalidReorderListReturnsBadRequest() {
        allowDraftWrite();
        doThrow(new IllegalArgumentException("IDs must be exact set"))
                .when(repository).reorder(ROUND_ID, List.of(QUESTION_ID, QUESTION_ID));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.reorderQuestions(ROUND_ID, List.of(QUESTION_ID, QUESTION_ID)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(repository, never()).bumpRoundVersion(anyLong(), any(Instant.class));
    }

    @Test
    void reorderingReturnsNewOrderAndBumpsVersion() {
        allowDraftWrite();
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);
        when(repository.findAllByRound(ROUND_ID)).thenReturn(List.of(
                new Question(41L, ROUND_ID, "Second", true, 1),
                new Question(QUESTION_ID, ROUND_ID, "First", true, 2)));

        var result = service.reorderQuestions(ROUND_ID, List.of(41L, QUESTION_ID));

        assertEquals(List.of("41", "40"), result.items().stream().map(
                ApplicationQuestionService.QuestionView::id).toList());
        verify(repository).reorder(ROUND_ID, List.of(41L, QUESTION_ID));
        verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }
}
