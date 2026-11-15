package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.*;
import com.tu.clubhub.application.config.ApplicationSubmissionProperties;
import com.tu.clubhub.application.repository.CommitteeApplicationRepository;
import com.tu.clubhub.application.repository.SelectionResultRepository;
import com.tu.clubhub.application.repository.SelectionResultRepository.Application;
import com.tu.clubhub.application.repository.SelectionResultRepository.Round;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.committee.security.ClubSecurity.WritePermission;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

import static com.tu.clubhub.application.service.ApplicationSubmissionException.*;

@Service
public class SelectionResultService {
    private static final Logger LOG = LoggerFactory.getLogger(SelectionResultService.class);
    private static final Set<String> DECIDABLE = Set.of("SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED");
    private final SelectionResultRepository repository;
    private final CommitteeApplicationRepository reads;
    private final ClubSecurity security;
    private final Clock clock;
    private final ObjectMapper json;
    private final String lockTimeout;

    public SelectionResultService(SelectionResultRepository repository, CommitteeApplicationRepository reads,
            ClubSecurity security, Clock clock, ObjectMapper json, ApplicationSubmissionProperties properties) {
        this.repository = repository;
        this.reads = reads;
        this.security = security;
        this.clock = clock;
        this.json = json;
        this.lockTimeout = properties.databaseLockTimeout();
    }

    /** Dedicated editor snapshot; the trimmed Task65 GET contract is unchanged. */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CommitteeApplicationDetail editor(String rawRound, String rawApplication) {
        long actor = actor();
        Round round = repository.round(id(rawRound), false, false).orElseThrow(SelectionResultService::missing);
        if (!security.isCommittee(round.clubId()) || reads.isApplicant(actor, round.id())) throw denied();
        publishedRound(round);
        return repository.detail(scopedApplication(id(rawApplication), round.id()));
    }

    @Transactional(rollbackFor = Exception.class)
    public CommitteeApplicationDetail decide(String rawRound, String rawApplication, ApplicationDecisionRequest request) {
        return lockErrors(() -> decideAll(rawRound, List.of(
                new BatchApplicationDecisionRequest.Item(Long.toString(id(rawApplication)), request))).getFirst());
    }

    @Transactional(rollbackFor = Exception.class)
    public List<CommitteeApplicationDetail> decideBatch(String rawRound, BatchApplicationDecisionRequest request) {
        return lockErrors(() -> decideAll(rawRound, request.decisions()));
    }

    private List<CommitteeApplicationDetail> decideAll(String rawRound, List<BatchApplicationDecisionRequest.Item> requests) {
        long actor = actor();
        long roundId = id(rawRound);
        var permission = permission(roundId, false);
        Round round = repository.round(roundId, true, false).orElseThrow(SelectionResultService::missing);
        List<Long> ids = requests.stream().map(i -> id(i.applicationId())).toList();
        if (ids.isEmpty() || ids.size() > 100 || ids.stream().distinct().count() != ids.size())
            throw validation(List.of(new com.tu.clubhub.auth.dto.ProblemResponse.FieldError("decisions", "INVALID", "Invalid batch.")));
        var locked = repository.lockApplications(roundId, ids).stream().collect(Collectors.toMap(Application::id, a -> a));
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        requirePermission(permission, round, now);
        closedUnpublished(round, now);
        // Validate every item before the first mutation, then retain every lock until commit.
        for (var item : requests) {
            var app = locked.get(id(item.applicationId()));
            if (app == null) {
                scopedApplication(id(item.applicationId()), roundId); // preserve 403/404 for foreign/missing children
                throw conflict("VERSION_MISMATCH"); // resource scope changed concurrently
            }
            if (!DECIDABLE.contains(app.status())) {
                throw conflict("INVALID_STATUS_TRANSITION");
            }
            if (app.version() != item.decision().version()) {
                throw conflict("VERSION_MISMATCH");
            }
        }
        UUID trace = UUID.randomUUID();
        var updated = new ArrayList<Application>(requests.size());
        for (var item : requests) {
            var before = locked.get(id(item.applicationId()));
            var request = item.decision();
            repository.decide(before, request, actor, now);
            repository.audit(round, before.id(), actor, "DECISION_RECORDED", now, trace,
                    json.writeValueAsString(Map.of("status", before.status(), "version", before.version())),
                    json.writeValueAsString(Map.of("status", request.decision(), "version", before.version() + 1,
                            "resultMessageChanged", !Objects.equals(before.resultMessage(), request.resultMessage()),
                            "internalNoteWritten", request.internalNote() != null && !request.internalNote().isBlank())));
            updated.add(new Application(
                    before.id(), before.roundId(), before.clubId(), before.applicantId(),
                    request.decision(), request.resultMessage(), Long.toString(actor), now,
                    before.respondedAt(), before.version() + 1));
        }
        afterCommit(actor, round, "DECISION_RECORDED", now, trace, requests.size(), 0, 0);
        return updated.stream().map(repository::detail).toList();
    }

    @Transactional(rollbackFor = Exception.class)
    public PublishResultsResponse publish(String rawRound, PublishResultsRequest request) {
        return lockErrors(() -> {
            long actor = actor();
            long roundId = id(rawRound);
            var permission = permission(roundId, true);
            Round round = repository.round(roundId, true, true).orElseThrow(SelectionResultService::missing);
            var applications = repository.lockApplications(roundId, null);
            Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
            requirePermission(permission, round, now);
            closedUnpublished(round, now);
            if (!now.isBefore(round.confirmationDeadline())) throw conflict("CONFIRMATION_DEADLINE_EXPIRED");
            if (applications.stream().anyMatch(a -> !Set.of("ACCEPTED", "REJECTED", "WITHDRAWN").contains(a.status())))
                throw conflict("APPLICATIONS_INCOMPLETE");
            if (round.version() != request.version()) throw conflict("VERSION_MISMATCH");
            long accepted = applications.stream().filter(a -> a.status().equals("ACCEPTED")).count();
            long rejected = applications.stream().filter(a -> a.status().equals("REJECTED")).count();
            UUID trace = UUID.randomUUID();
            repository.publish(round, applications, now);
            repository.audit(round, null, actor, "RESULTS_PUBLISHED", now, trace,
                    json.writeValueAsString(Map.of("version", round.version(), "published", false)),
                    json.writeValueAsString(Map.of("version", round.version()+1, "published", true,
                            "acceptedCount", accepted, "rejectedCount", rejected)));
            afterCommit(actor, round, "PUBLISH_SELECTION_RESULTS", now, trace, applications.size(), accepted, rejected);
            return new PublishResultsResponse(Long.toString(roundId), Long.toString(round.clubId()), now,
                    round.confirmationDeadline(), accepted, rejected, round.version()+1);
        });
    }

    private WritePermission permission(long roundId, boolean presidentOnly) {
        repository.lockTimeout(lockTimeout);
        Round scope = repository.round(roundId, false, false).orElseThrow(SelectionResultService::missing);
        return security.lockWritePermission(scope.clubId(), presidentOnly).orElseThrow(SelectionResultService::denied);
    }
    private void requirePermission(WritePermission permission, Round round, Instant now) {
        if (permission.clubId() != round.clubId() || !security.hasPermissionAt(permission, now)
                || reads.isApplicant(permission.userId(), round.id())) throw denied();
    }
    private Application scopedApplication(long applicationId, long roundId) {
        var app = repository.application(applicationId).orElseThrow(SelectionResultService::missing);
        if (app.roundId() != roundId) throw denied();
        return app;
    }
    private static void publishedRound(Round round) {
        if (round.publicationStatus().equals("CANCELLED")) throw conflict("ROUND_CANCELLED");
        if (!round.publicationStatus().equals("PUBLISHED") || round.publishedAt() == null) throw conflict("ROUND_NOT_PUBLISHED");
    }
    private static void closedUnpublished(Round round, Instant now) {
        publishedRound(round);
        if (now.isBefore(round.closedAt() == null ? round.closesAt() : round.closedAt())) throw conflict("ROUND_STILL_OPEN");
        if (round.resultsPublishedAt() != null) throw conflict("RESULTS_ALREADY_PUBLISHED");
    }
    private static <T> T lockErrors(Supplier<T> action) {
        try {
            return action.get();
        } catch (RuntimeException error) {
            for (Throwable cause = error; cause != null; cause = cause.getCause()) {
                if (cause instanceof SQLException sql && Set.of("55P03", "40P01").contains(sql.getSQLState())) {
                    var unavailable = failure(503, "SERVICE_UNAVAILABLE", "Selection results are temporarily unavailable.");
                    unavailable.initCause(error);
                    throw unavailable;
                }
            }
            throw error;
        }
    }
    private static void afterCommit(long actor, Round round, String action, Instant now, UUID trace,
            long count, long accepted, long rejected) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                LOG.atInfo().addKeyValue("event", action.equals("PUBLISH_SELECTION_RESULTS") ? "ROUND_RESULTS_PUBLISHED" : "APPLICATION_DECISION_RECORDED")
                        .addKeyValue("actorId", actor).addKeyValue("action", action).addKeyValue("roundId", round.id())
                        .addKeyValue("clubId", round.clubId()).addKeyValue("occurredAt", now).addKeyValue("traceId", trace)
                        .addKeyValue("applicationCount", count).addKeyValue("acceptedCount", accepted)
                        .addKeyValue("rejectedCount", rejected).log("Selection result mutation committed");
            }
        });
    }
    private static long actor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken
                || !(auth.getPrincipal() instanceof ClubHubPrincipal p) || p.userId() == null || p.userId() <= 0)
            throw failure(401, "AUTHENTICATION_REQUIRED", "Sign in to access this resource.");
        return ((ClubHubPrincipal) auth.getPrincipal()).userId();
    }
    private static long id(String raw) {
        try {
            if (raw == null || !raw.matches("[1-9][0-9]{0,18}")) throw new IllegalArgumentException();
            return Long.parseLong(raw);
        } catch (IllegalArgumentException e) { throw failure(400, "INVALID_RESOURCE_ID", "Invalid resource identifier."); }
    }
    private static ApplicationSubmissionException missing() {
        return failure(404, "RESOURCE_NOT_FOUND", "Resource not found.");
    }

    private static ApplicationSubmissionException denied() {
        return failure(403, "ACCESS_DENIED", "Access denied.");
    }
}
