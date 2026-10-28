package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.ApplicationSubmission;
import com.tu.clubhub.application.config.ApplicationSubmissionProperties;
import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission;
import com.tu.clubhub.application.repository.ApplicationRepository;
import com.tu.clubhub.application.repository.ApplicationRepository.Question;
import com.tu.clubhub.application.repository.ApplicationRepository.Round;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Implements API_v1.md section 11. HTTP/CSRF handling belongs to the controller/security filters. */
@Service
public class ApplicationService {
    private final ApplicationRepository repository;
    private final ApplicationSubmissionValidator validator;
    private final Clock clock;
    private final String lockTimeout;

    public ApplicationService(ApplicationRepository repository,
            ApplicationSubmissionValidator validator, Clock clock, ApplicationSubmissionProperties properties) {
        this.repository = repository;
        this.validator = validator;
        this.clock = clock;
        this.lockTimeout = properties.databaseLockTimeout();
    }

    /**
     * Public proxy entry point. Lock order: applicant, profile, club, round,
     * questions, memberships; all locks last until commit/rollback.
     * SUBMITTED is the persisted/API status displayed as Pending, per the contract.
     */
    @Transactional(rollbackFor = Exception.class)
    public ApplicationSubmission submit(String rawRoundId, ApplicationSubmissionRequest request) {
        try {
            return submitInCurrentTransaction(rawRoundId, request);
        } catch (DataAccessException exception) {
            // PostgreSQL lock_timeout can be UncategorizedSQLException, so use
            // the exact SQLSTATE rather than depending on Spring's subtype.
            if (isTransientLockFailure(exception)) {
                var unavailable = failure(503, "SERVICE_UNAVAILABLE",
                        "Application submission is temporarily unavailable. Retry after checking your application history.");
                unavailable.initCause(exception);
                throw unavailable;
            }
            throw exception;
        }
    }

    private ApplicationSubmission submitInCurrentTransaction(String rawRoundId, ApplicationSubmissionRequest request) {
        long userId = currentUserId();
        repository.setLocalLockTimeout(lockTimeout);
        requireActiveAccount(repository.lockAccount(userId));
        ValidatedApplicationSubmission input = validator.validate(rawRoundId, request);
        if (repository.lockStudentStatus(userId).filter("ACTIVE"::equals).isEmpty()) {
            throw failure(403, "ACCESS_DENIED", "Verified active student status is required.");
        }
        long clubId = repository.findRoundClubId(input.roundId()).orElseThrow(ApplicationService::notFound);
        if (repository.lockClubStatus(clubId).filter("ACTIVE"::equals).isEmpty()) throw notFound();
        Round round = repository.lockRound(input.roundId()).orElseThrow(ApplicationService::notFound);
        if (round.publishedAt() == null) throw notFound();

        // Sample only after acquiring the round lock, including time spent waiting for it.
        Instant now = clock.instant();
        requireOpenRound(round, now);
        validateQuestions(input, repository.lockQuestions(round.id()));

        if (repository.hasApplication(round.id(), userId)) throw conflict("APPLICATION_ALREADY_EXISTS");
        var memberships = repository.lockAndReadMemberships(userId, round.clubId(), now);
        if (memberships.alreadyMember()) throw conflict("ALREADY_MEMBER");
        if (memberships.distinctClubs() >= 5) throw conflict("MEMBERSHIP_LIMIT_REACHED");

        long applicationId;
        try {
            applicationId = repository.insertApplication(round.id(), round.clubId(), userId, input.motivation(), now);
        } catch (DuplicateKeyException exception) {
            if (ApplicationRepository.isRoundApplicantConflict(exception)) throw conflict("APPLICATION_ALREADY_EXISTS");
            throw exception;
        }
        repository.insertAnswers(applicationId, round.id(), input.answers());
        repository.insertLinks(applicationId, input.links(), now);
        repository.insertInitialHistory(applicationId, userId, now);
        return new ApplicationSubmission(Long.toString(applicationId), Long.toString(round.clubId()),
                Long.toString(round.id()), "SUBMITTED", now);
    }

    private static void requireActiveAccount(Optional<String> status) {
        String accountStatus = status
                .orElseThrow(() -> failure(401, "AUTHENTICATION_REQUIRED", "A valid account is required."));
        if (!"ACTIVE".equals(accountStatus)) {
            throw failure(403, "ACCOUNT_NOT_ALLOWED", "This account is not allowed to use TU-ClubHub.");
        }
    }

    private static long currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal() instanceof ClubHubPrincipal principal)
                || principal.userId() == null || principal.userId() <= 0) {
            throw failure(401, "AUTHENTICATION_REQUIRED", "Sign in to submit an application.");
        }
        return principal.userId();
    }

    private static void requireOpenRound(Round round, Instant now) {
        if ("CANCELLED".equals(round.publicationStatus())) throw conflict("ROUND_CANCELLED");
        if (!"PUBLISHED".equals(round.publicationStatus())) throw notFound();
        if (now.isBefore(round.opensAt())) throw conflict("ROUND_NOT_OPEN");
        if (round.closedAt() != null || !now.isBefore(round.closesAt())) throw conflict("ROUND_CLOSED");
    }

    private static void validateQuestions(ValidatedApplicationSubmission input, List<Question> questions) {
        Map<Long, Question> byId = questions.stream().collect(Collectors.toMap(Question::id, Function.identity()));
        var supplied = new HashSet<Long>();
        var errors = new ArrayList<FieldError>();
        for (int i = 0; i < input.answers().size(); i++) {
            var answer = input.answers().get(i);
            Question question = byId.get(answer.questionId());
            if (question == null) {
                errors.add(new FieldError("answers[" + i + "].questionId", "INVALID", "Question does not belong to this round."));
            } else {
                supplied.add(question.id());
                if (answer.inputLength() > question.maxLength()) {
                    errors.add(new FieldError("answers[" + i + "].answerText", "TOO_LONG", "Answer exceeds this question's maximum length."));
                }
            }
        }
        for (Question question : questions) {
            if (question.required() && !supplied.contains(question.id())) {
                errors.add(new FieldError("answers", "REQUIRED", "An answer to required question " + question.id() + " is missing."));
            }
        }
        if (!errors.isEmpty()) throw ApplicationSubmissionException.validation(errors);
    }

    private static ApplicationSubmissionException notFound() {
        return failure(404, "RESOURCE_NOT_FOUND", "No published recruitment round was found.");
    }

    private static boolean isTransientLockFailure(DataAccessException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql
                    && ("55P03".equals(sql.getSQLState()) || "40P01".equals(sql.getSQLState()))) return true;
        }
        return false;
    }
    private static ApplicationSubmissionException failure(int status, String code, String detail) {
        return ApplicationSubmissionException.failure(status, code, detail);
    }
    private static ApplicationSubmissionException conflict(String reason) {
        return ApplicationSubmissionException.conflict(reason);
    }
}
