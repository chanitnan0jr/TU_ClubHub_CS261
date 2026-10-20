package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.Question;
import com.tu.clubhub.recruitment.repository.ApplicationQuestionRepository.RoundScope;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.util.List;

@Service
public class ApplicationQuestionService {

    private final ApplicationQuestionRepository repository;
    private final ClubSecurity clubSecurity;
    private final Clock clock;

    public ApplicationQuestionService(
            ApplicationQuestionRepository repository,
            ClubSecurity clubSecurity,
            Clock clock) {

        this.repository = repository;
        this.clubSecurity = clubSecurity;
        this.clock = clock;
    }

    public record QuestionView(
            String id,
            String roundId,
            String questionText,
            boolean isRequired,
            int displayOrder) {
    }

    public record QuestionListView(List<QuestionView> items) {
    }

    @Transactional(readOnly = true)
    public QuestionListView listQuestions(Long roundId) {
        authorizedRound(roundId, false);
        return currentQuestions(roundId);
    }

    @Transactional
    public QuestionView createQuestion(
            Long roundId,
            String questionText,
            Boolean isRequired) {

        RoundScope round = authorizedRound(roundId, true);
        requireEditable(round);

        String text = requireQuestionText(questionText);
        boolean required = requireIsRequired(isRequired);

        long questionId = repository.insert(roundId, text, required);

        bumpRoundVersion(roundId);
        return getQuestion(roundId, questionId);
    }

    @Transactional
    public QuestionView updateQuestion(
            Long roundId,
            Long questionId,
            String questionText,
            Boolean isRequired) {

        RoundScope round = authorizedRound(roundId, true);

        requirePositiveId(questionId, "questionId");
        requireQuestion(roundId, questionId);
        requireEditable(round);

        String text = requireQuestionText(questionText);
        boolean required = requireIsRequired(isRequired);

        if (repository.update(
                roundId, questionId, text, required) != 1) {

            throw conflict(
                    "Question changed during update; reload and retry");
        }

        bumpRoundVersion(roundId);
        return getQuestion(roundId, questionId);
    }

    @Transactional
    public void deleteQuestion(Long roundId, Long questionId) {
        RoundScope round = authorizedRound(roundId, true);

        requirePositiveId(questionId, "questionId");
        requireQuestion(roundId, questionId);

        if (repository.hasAnswers(roundId, questionId)) {
            throw conflict(
                    "Question has answers and cannot be deleted");
        }

        requireEditable(round);

        try {
            if (repository.delete(roundId, questionId) != 1) {
                throw conflict(
                        "Question changed during delete; reload and retry");
            }
        } catch (DataIntegrityViolationException ex) {
            throw conflict(
                    "Question is referenced by application data and cannot be deleted");
        }

        repository.compactDisplayOrder(roundId);
        bumpRoundVersion(roundId);
    }

    @Transactional
    public QuestionListView reorderQuestions(
            Long roundId,
            List<Long> questionIds) {

        RoundScope round = authorizedRound(roundId, true);
        requireEditable(round);

        if (questionIds == null) {
            throw badRequest("questionIds is required");
        }

        try {
            repository.reorder(roundId, questionIds);
        } catch (IllegalArgumentException ex) {
            throw badRequest(ex.getMessage());
        } catch (InvalidDataAccessApiUsageException ex) {
            // Spring may translate exceptions thrown by @Repository.
            if (ex.getMostSpecificCause()
                    instanceof IllegalArgumentException) {

                throw badRequest(
                        "questionIds must list every question in this round exactly once");
            }

            if (ex.getMostSpecificCause()
                    instanceof IllegalStateException) {

                throw conflict(
                        "Question order could not be updated; reload and retry");
            }

            throw ex;
        } catch (IllegalStateException ex) {
            throw conflict(
                    "Question order could not be updated; reload and retry");
        }

        bumpRoundVersion(roundId);
        return currentQuestions(roundId);
    }

    private RoundScope authorizedRound(
            Long roundId,
            boolean forWrite) {

        requirePositiveId(roundId, "roundId");

        long userId = currentUserId();

        RoundScope round = (forWrite
                ? repository.lockRoundScope(roundId)
                : repository.findRoundScope(roundId))
                .orElseThrow(
                        () -> notFound("Recruitment round not found"));

        if (!clubSecurity.isCommittee(round.clubId())) {
            throw new AccessDeniedException(
                    "Active committee permission for the round's club is required");
        }

        if (repository.hasApplicationByApplicant(roundId, userId)) {
            throw new AccessDeniedException(
                    "Committee members cannot manage rounds they applied to");
        }

        return round;
    }

    private long currentUserId() {
        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                        instanceof ClubHubPrincipal principal)
                || principal.userId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "An authenticated ClubHub account is required");
        }

        return principal.userId();
    }

    private void requireEditable(RoundScope round) {
        if (!"DRAFT".equals(round.publicationStatus())
                || round.closed()) {

            throw conflict(
                    "Only open draft rounds can have their questions edited");
        }

        if (repository.hasApplications(round.id())) {
            throw conflict(
                    "Rounds with applications cannot have questions edited");
        }
    }

    private void requireQuestion(
            Long roundId,
            Long questionId) {

        if (repository.findByIdAndRound(
                roundId, questionId).isEmpty()) {

            throw notFound("Question not found in this round");
        }
    }

    private QuestionView getQuestion(
            Long roundId,
            Long questionId) {

        Question question = repository
                .findByIdAndRound(roundId, questionId)
                .orElseThrow(
                        () -> notFound("Question not found in this round"));

        return asView(question);
    }

    private QuestionListView currentQuestions(Long roundId) {
        return new QuestionListView(
                repository.findAllByRound(roundId)
                        .stream()
                        .map(this::asView)
                        .toList());
    }

    private QuestionView asView(Question question) {
        return new QuestionView(
                Long.toString(question.id()),
                Long.toString(question.roundId()),
                question.questionText(),
                question.isRequired(),
                question.displayOrder());
    }

    private String requireQuestionText(String text) {
        if (text == null || text.isBlank()) {
            throw badRequest("questionText must not be blank");
        }

        return text.strip();
    }

    private boolean requireIsRequired(Boolean isRequired) {
        if (isRequired == null) {
            throw badRequest("isRequired is required");
        }

        return isRequired;
    }

    private void requirePositiveId(Long id, String name) {
        if (id == null || id <= 0) {
            throw badRequest(name + " must be positive");
        }
    }

    private void bumpRoundVersion(Long roundId) {
        if (repository.bumpRoundVersion(
                roundId, clock.instant()) != 1) {

            throw conflict(
                    "Round changed during question edit; reload and retry");
        }
    }

    private ResponseStatusException notFound(String message) {
        return new ResponseStatusException(
                HttpStatus.NOT_FOUND, message);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(
                HttpStatus.CONFLICT, message);
    }
}