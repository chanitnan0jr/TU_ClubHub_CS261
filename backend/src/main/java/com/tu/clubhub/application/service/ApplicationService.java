package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.ApplicantApplicationSummary;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.Club;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.Detail;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.DocumentLink;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.Page;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.QuestionAnswer;
import com.tu.clubhub.application.dto.ApplicantApplicationSummary.StatusHistoryEntry;
import com.tu.clubhub.application.dto.ApplicationSubmission;
import com.tu.clubhub.application.config.ApplicationSubmissionProperties;
import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.dto.RoundApplicationForm;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission;
import com.tu.clubhub.application.repository.ApplicationRepository;
import com.tu.clubhub.application.repository.ApplicationRepository.ApplicantApplicationRow;
import com.tu.clubhub.application.repository.ApplicationRepository.FormRound;
import com.tu.clubhub.application.repository.ApplicationRepository.Question;
import com.tu.clubhub.application.repository.ApplicationRepository.Round;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
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

/** Implements API_v1.md sections 11 and 12. HTTP/CSRF handling belongs to the controller/security filters. */
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

    /**
     * API_v1.md section 12: the same visibility and window checks as submission, with plain
     * reads because loading a form reserves nothing. ActiveAccountFilter has already rejected
     * a suspended account. Duplicate-application and membership checks stay on POST only.
     */
    @Transactional(readOnly = true)
    public RoundApplicationForm form(String rawRoundId) {
        long userId = currentUserId();
        long roundId = validator.roundId(rawRoundId);
        if (repository.findStudentStatus(userId).filter("ACTIVE"::equals).isEmpty()) {
            throw failure(403, "ACCESS_DENIED", "Verified active student status is required.");
        }
        FormRound form = repository.findFormRound(roundId).orElseThrow(ApplicationService::notFound);
        Round round = form.round();
        if (!"ACTIVE".equals(form.clubStatus()) || round.publishedAt() == null) throw notFound();
        requireOpenRound(round, clock.instant());
        var questions = repository.findFormQuestions(roundId).stream()
                .map(q -> new RoundApplicationForm.TextQuestion(Long.toString(q.id()), "TEXT", q.prompt(),
                        q.required(), q.displayOrder(), q.maxLength()))
                .toList();
        return new RoundApplicationForm(new RoundApplicationForm.Round(Long.toString(round.id()),
                Long.toString(round.clubId()), form.title(), form.description(), form.eligibilityText(),
                round.opensAt(), round.closesAt()), questions);
    }

    /**
     * US-04 / Task64: Paginated list of the caller's own applications.
     * Pre-publication results are masked as SUBMITTED ("รอพิจารณา") per T74-D04.
     */
    @Transactional(readOnly = true)
    public Page listMyApplications(int page, int size) {
        long userId = currentUserId();
        validator.validatePage(page, size);
        Instant now = clock.instant();
        boolean activeStudent = repository.findStudentStatus(userId).filter("ACTIVE"::equals).isPresent();
        long offset = (long) page * size;
        List<ApplicantApplicationSummary> items = repository.findPageByApplicant(userId, size, offset).stream()
                .map(row -> toApplicantSummary(row, activeStudent, now))
                .toList();
        long totalElements = repository.countByApplicant(userId);
        long totalPages = totalElements == 0 ? 0 : (totalElements + size - 1) / size;
        return new Page(items, new PublicPageMetadataDto(page, size, totalElements, totalPages));
    }

    /**
     * US-04 / Task64: Detail and applicant-safe timeline of a single application.
     * T74-D01: 404 when absent; 403 ACCESS_DENIED when owned by another applicant.
     */
    @Transactional(readOnly = true)
    public Detail getMyApplicationDetail(String rawApplicationId) {
        long userId = currentUserId();
        long applicationId = validator.applicationId(rawApplicationId);
        ApplicantApplicationRow row = repository.findApplicationById(applicationId)
                .orElseThrow(ApplicationService::applicationNotFound);
        if (row.applicantId() != userId) {
            throw failure(403, "ACCESS_DENIED", "You do not have permission to view this application.");
        }
        Instant now = clock.instant();
        boolean activeStudent = repository.findStudentStatus(userId).filter("ACTIVE"::equals).isPresent();
        return toApplicantDetail(row, activeStudent, now);
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

    private static ApplicationSubmissionException applicationNotFound() {
        return failure(404, "RESOURCE_NOT_FOUND", "Application was not found.");
    }

    private ApplicantApplicationSummary toApplicantSummary(
            ApplicantApplicationRow row, boolean activeStudent, Instant now) {
        boolean resultsPublished = isResultsPublished(row, now);
        String visibleStatus = resolveVisibleStatus(row, resultsPublished, now);
        boolean canDecline = canRespondToOffer(row, visibleStatus, resultsPublished, now);
        boolean canConfirm = canDecline && activeStudent && "ACTIVE".equals(row.clubStatus());
        Instant respondedAt = resultsPublished
                && ("CONFIRMED".equals(visibleStatus) || "DECLINED".equals(visibleStatus))
                ? row.respondedAt() : null;

        return new ApplicantApplicationSummary(
                Long.toString(row.id()),
                new Club(Long.toString(row.clubId()), row.clubName(), row.clubImageUrl()),
                new ApplicantApplicationSummary.Round(
                        Long.toString(row.roundId()),
                        row.roundTitle(),
                        row.academicYear(),
                        row.semester(),
                        row.opensAt(),
                        row.closesAt(),
                        resultsPublished ? row.resultsPublishedAt() : null,
                        resultsPublished ? row.confirmationDeadline() : null),
                row.submittedAt(),
                visibleStatus,
                displayStatusLabel(visibleStatus),
                canConfirm,
                canDecline,
                respondedAt);
    }

    private Detail toApplicantDetail(
            ApplicantApplicationRow row, boolean activeStudent, Instant now) {
        ApplicantApplicationSummary summary = toApplicantSummary(row, activeStudent, now);
        boolean resultsPublished = isResultsPublished(row, now);
        List<QuestionAnswer> questionsWithAnswers = repository.findQuestionsWithAnswers(row.roundId(), row.id()).stream()
                .map(q -> new QuestionAnswer(
                        Long.toString(q.questionId()),
                        q.questionText(),
                        q.required(),
                        q.displayOrder(),
                        q.answerText()))
                .toList();
        List<DocumentLink> links = repository.findApplicationLinks(row.id()).stream()
                .map(l -> new DocumentLink(l.label(), l.url(), l.displayOrder()))
                .toList();
        List<StatusHistoryEntry> timeline = buildApplicantTimeline(row, resultsPublished, now);

        return new Detail(
                summary.id(),
                summary.club(),
                summary.round(),
                row.motivation(),
                questionsWithAnswers,
                links,
                summary.submittedAt(),
                summary.applicantVisibleStatus(),
                summary.displayStatusLabel(),
                resultsPublished ? row.resultMessage() : null,
                summary.canConfirm(),
                summary.canDecline(),
                summary.respondedAt(),
                timeline);
    }

    private List<StatusHistoryEntry> buildApplicantTimeline(
            ApplicantApplicationRow row, boolean resultsPublished, Instant now) {
        List<StatusHistoryEntry> history = new ArrayList<>();
        history.add(new StatusHistoryEntry("SUBMITTED", "ส่งใบสมัครแล้ว", row.submittedAt()));

        if ("WITHDRAWN".equals(row.status())) {
            Instant withdrawnAt = repository.findLatestStatusChangeTime(row.id(), "WITHDRAWN")
                    .orElse(row.updatedAt());
            history.add(new StatusHistoryEntry("WITHDRAWN", "ถอนใบสมัครแล้ว", withdrawnAt));
            return List.copyOf(history);
        }

        if (!resultsPublished) {
            return List.copyOf(history);
        }

        if ("ACCEPTED".equals(row.status())
                || "CONFIRMED".equals(row.status())
                || "DECLINED".equals(row.status())
                || "EXPIRED".equals(row.status())) {
            history.add(new StatusHistoryEntry(
                    "ACCEPTED_PENDING_CONFIRMATION",
                    "ประกาศผลคัดเลือก (ผ่านการคัดเลือก)",
                    row.resultsPublishedAt()));
        } else if ("REJECTED".equals(row.status())) {
            history.add(new StatusHistoryEntry(
                    "REJECTED",
                    "ประกาศผลคัดเลือก (ไม่ผ่านการคัดเลือก)",
                    row.resultsPublishedAt()));
        }

        if ("CONFIRMED".equals(row.status()) && row.respondedAt() != null) {
            history.add(new StatusHistoryEntry("CONFIRMED", "ยืนยันสิทธิ์แล้ว", row.respondedAt()));
        } else if ("DECLINED".equals(row.status()) && row.respondedAt() != null) {
            history.add(new StatusHistoryEntry("DECLINED", "สละสิทธิ์", row.respondedAt()));
        } else if ("EXPIRED".equals(row.status())
                || ("ACCEPTED".equals(row.status())
                        && row.confirmationDeadline() != null
                        && !now.isBefore(row.confirmationDeadline()))) {
            Instant expiredAt = row.confirmationDeadline() != null ? row.confirmationDeadline() : row.updatedAt();
            history.add(new StatusHistoryEntry("EXPIRED", "สละสิทธิ์ (หมดเวลาตอบรับ)", expiredAt));
        }

        return List.copyOf(history);
    }

    private static boolean isResultsPublished(ApplicantApplicationRow row, Instant now) {
        return row.resultsPublishedAt() != null && !now.isBefore(row.resultsPublishedAt());
    }

    private static String resolveVisibleStatus(
            ApplicantApplicationRow row, boolean resultsPublished, Instant now) {
        if ("WITHDRAWN".equals(row.status())) {
            return "WITHDRAWN";
        }
        if (!resultsPublished) {
            return "SUBMITTED";
        }
        return switch (row.status()) {
            case "ACCEPTED" -> (row.confirmationDeadline() != null && !now.isBefore(row.confirmationDeadline()))
                    ? "EXPIRED"
                    : "ACCEPTED_PENDING_CONFIRMATION";
            case "REJECTED" -> "REJECTED";
            case "CONFIRMED" -> "CONFIRMED";
            case "DECLINED" -> "DECLINED";
            case "EXPIRED" -> "EXPIRED";
            default -> "SUBMITTED";
        };
    }

    private static boolean canRespondToOffer(
            ApplicantApplicationRow row, String visibleStatus, boolean resultsPublished, Instant now) {
        return resultsPublished
                && "PUBLISHED".equals(row.roundPublicationStatus())
                && "ACCEPTED_PENDING_CONFIRMATION".equals(visibleStatus)
                && row.confirmationDeadline() != null
                && now.isBefore(row.confirmationDeadline());
    }

    private static String displayStatusLabel(String visibleStatus) {
        return switch (visibleStatus) {
            case "ACCEPTED_PENDING_CONFIRMATION" -> "ผ่านการคัดเลือก (รอยืนยันสิทธิ์)";
            case "REJECTED" -> "ไม่ผ่านการคัดเลือก";
            case "CONFIRMED" -> "ยืนยันสิทธิ์แล้ว";
            case "DECLINED" -> "สละสิทธิ์";
            case "EXPIRED" -> "สละสิทธิ์ (หมดเวลาตอบรับ)";
            case "WITHDRAWN" -> "ถอนใบสมัครแล้ว";
            default -> "รอพิจารณา";
        };
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
