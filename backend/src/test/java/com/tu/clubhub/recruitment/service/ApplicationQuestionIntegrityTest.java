package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.Question;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.RoundScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
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

class ApplicationQuestionIntegrityTest {

    private static final long ROUND_ID = 10L;
    private static final long CLUB_ID = 20L;
    private static final long USER_ID = 30L;
    private static final long QUESTION_ID = 40L;

    private ApplicationQuestionRepository repository;
    private ApplicationQuestionService service;

    @BeforeEach
    void setUp() {
        repository = mock(ApplicationQuestionRepository.class);
        ClubSecurity security = mock(ClubSecurity.class);

        service = new ApplicationQuestionService(
                repository,
                security,
                Clock.fixed(
                        Instant.parse("2026-10-20T12:00:00Z"),
                        ZoneOffset.UTC));

        var principal = new ClubHubPrincipal(
                USER_ID, "test-committee", "USER");

        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, List.of()));
        SecurityContextHolder.setContext(context);

        when(repository.findRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(
                        ROUND_ID, CLUB_ID, "DRAFT", false, 0L)));
        when(repository.lockRoundScope(ROUND_ID))
                .thenReturn(Optional.of(new RoundScope(
                        ROUND_ID, CLUB_ID, "DRAFT", false, 0L)));

        when(security.isCommittee(CLUB_ID)).thenReturn(true);
        when(repository.hasApplications(ROUND_ID)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void answeredQuestionCannotBeUpdatedAndRoundIsLockedBeforeCheckingAnswers() {
        existingQuestion();
        when(repository.hasAnswers(ROUND_ID, QUESTION_ID)).thenReturn(true);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.updateQuestion(ROUND_ID, QUESTION_ID, "Changed question", false));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals("Question has answers", error.getReason());
        var order = inOrder(repository);
        order.verify(repository).lockRoundScope(ROUND_ID);
        order.verify(repository).hasAnswers(ROUND_ID, QUESTION_ID);
        verify(repository, never()).update(anyLong(), anyLong(), anyString(), anyBoolean());
        verifyNoVersionChange();
    }

    @Test
    void answeredQuestionCannotBeDeleted() {
        existingQuestion();
        when(repository.hasAnswers(ROUND_ID, QUESTION_ID)).thenReturn(true);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.deleteQuestion(ROUND_ID, QUESTION_ID));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals("Question has answers", error.getReason());
        verify(repository, never()).delete(anyLong(), anyLong());
        verify(repository, never()).compactDisplayOrder(anyLong());
        verifyNoVersionChange();
    }

    @Test
    void unansweredQuestionCanBeUpdatedEvenWithOtherApplications() {
        existingQuestion();
        when(repository.update(ROUND_ID, QUESTION_ID, "Changed question", false)).thenReturn(1);
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);
        service.updateQuestion(ROUND_ID, QUESTION_ID, "Changed question", false);
        verify(repository).update(ROUND_ID, QUESTION_ID, "Changed question", false);
        verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }

    @Test
    void unansweredQuestionCanBeDeletedEvenWithOtherApplications() {
        existingQuestion();
        when(repository.delete(ROUND_ID, QUESTION_ID)).thenReturn(1);
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);
        service.deleteQuestion(ROUND_ID, QUESTION_ID);
        verify(repository).delete(ROUND_ID, QUESTION_ID);
        verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }

    @Test
    void otherApplicationsDoNotPreventReordering() {
        when(repository.bumpRoundVersion(eq(ROUND_ID), any(Instant.class))).thenReturn(1);
        service.reorderQuestions(ROUND_ID, List.of(41L, QUESTION_ID));
        verify(repository).reorder(ROUND_ID, List.of(41L, QUESTION_ID));
        verify(repository).bumpRoundVersion(eq(ROUND_ID), any(Instant.class));
    }

    private void existingQuestion() {
        when(repository.findByIdAndRound(ROUND_ID, QUESTION_ID))
                .thenReturn(Optional.of(new Question(
                        QUESTION_ID,
                        ROUND_ID,
                        "Original question",
                        true,
                        1)));
    }

    private void verifyNoVersionChange() {
        verify(repository, never()).bumpRoundVersion(
                anyLong(), any(Instant.class));
    }
}