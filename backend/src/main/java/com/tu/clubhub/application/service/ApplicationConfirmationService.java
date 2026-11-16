package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.ApplicationConfirmationResponse;
import com.tu.clubhub.application.repository.ApplicationConfirmationRepository;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.tu.clubhub.application.service.ApplicationSubmissionException.*;

@Service
public class ApplicationConfirmationService {
    private final ApplicationConfirmationRepository repository;
    private final Clock clock;

    public ApplicationConfirmationService(ApplicationConfirmationRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(rollbackFor = Exception.class)
    public ApplicationConfirmationResponse confirm(String applicationId) {
        return respond(applicationId, true);
    }

    @Transactional(rollbackFor = Exception.class)
    public ApplicationConfirmationResponse decline(String applicationId) {
        return respond(applicationId, false);
    }

    private ApplicationConfirmationResponse respond(String rawId, boolean confirm) {
        long userId = actor();
        long id = positiveId(rawId);
        var scope = repository.findScope(id).orElseThrow(ApplicationConfirmationService::missing);
        if (scope.applicantId() != userId) throw denied();

        // Keep this order compatible with submission/assignment and Selection Result.
        String account = repository.lockAccount(userId)
                .orElseThrow(() -> failure(401, "AUTHENTICATION_REQUIRED", "A valid account is required."));
        if (!"ACTIVE".equals(account))
            throw failure(403, "ACCOUNT_NOT_ALLOWED", "This account is not allowed to use TU-ClubHub.");
        var student = repository.lockStudent(userId);
        String club = repository.lockClub(scope.clubId()).orElseThrow(ApplicationConfirmationService::missing);
        var round = repository.lockRound(scope.roundId()).orElseThrow(ApplicationConfirmationService::missing);
        var application = repository.lockApplication(id, scope.roundId())
                .orElseThrow(ApplicationConfirmationService::missing);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        if (application.applicantId() != userId) throw denied();
        if (application.clubId() != round.clubId() || application.clubId() != scope.clubId())
            throw conflict("APPLICATION_NOT_ACCEPTED");

        String target = confirm ? "CONFIRMED" : "DECLINED";
        if (target.equals(application.status())) {
            Long membership = confirm ? repository.membershipForApplication(id)
                    .orElseThrow(() -> new IllegalStateException("Confirmed application has no membership")) : null;
            return response(application, target, application.respondedAt(), membership, true);
        }
        if ("CONFIRMED".equals(application.status()) || "DECLINED".equals(application.status()))
            throw conflict("ALREADY_RESPONDED");
        if ("EXPIRED".equals(application.status())) throw conflict("CONFIRMATION_DEADLINE_EXPIRED");
        if ("CANCELLED".equals(round.publicationStatus())) throw conflict("ROUND_CANCELLED");
        if (!"PUBLISHED".equals(round.publicationStatus()) || round.resultsPublishedAt() == null
                || round.resultsPublishedAt().isAfter(now)) throw conflict("RESULTS_NOT_PUBLISHED");
        if (!"ACCEPTED".equals(application.status())) throw conflict("APPLICATION_NOT_ACCEPTED");
        if (confirm && (student.filter("ACTIVE"::equals).isEmpty() || !"ACTIVE".equals(club))) throw denied();
        if (!now.isBefore(round.confirmationDeadline())) throw conflict("CONFIRMATION_DEADLINE_EXPIRED");

        if (confirm) {
            if (repository.membershipExists(application.clubId(), userId)) throw conflict("EXISTING_CLUB_MEMBERSHIP");
            if (repository.activeMembershipCount(userId, now) >= 5) throw conflict("MEMBERSHIP_LIMIT_REACHED");
        }
        if (repository.updateApplicationStatus(id, application.version(), target, now) != 1)
            throw conflict("ALREADY_RESPONDED");
        Long membership = null;
        if (confirm) {
            try {
                membership = repository.insertMembership(application.clubId(), userId, id, now);
            } catch (DuplicateKeyException error) {
                var conflict = conflict("EXISTING_CLUB_MEMBERSHIP");
                conflict.initCause(error);
                throw conflict;
            }
        }
        repository.insertStatusHistory(id, userId, target, now);
        if (confirm) repository.insertMembershipHistory(membership, userId, now);
        return response(application, target, now, membership, false);
    }

    private static ApplicationConfirmationResponse response(
            ApplicationConfirmationRepository.ApplicationState app, String status, Instant at, Long membership,
            boolean replay) {
        return new ApplicationConfirmationResponse(Long.toString(app.id()), Long.toString(app.clubId()),
                Long.toString(app.roundId()), status, "CONFIRMED".equals(status) ? "ยืนยันสิทธิ์แล้ว" : "สละสิทธิ์",
                at, membership == null ? null : Long.toString(membership), replay);
    }

    private static long actor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken
                || !(auth.getPrincipal() instanceof ClubHubPrincipal p) || p.userId() == null || p.userId() <= 0)
            throw failure(401, "AUTHENTICATION_REQUIRED", "Sign in to access this resource.");
        return ((ClubHubPrincipal) auth.getPrincipal()).userId();
    }

    private static long positiveId(String raw) {
        try {
            if (raw == null || !raw.matches("[1-9][0-9]{0,18}")) throw new IllegalArgumentException();
            return Long.parseLong(raw);
        } catch (IllegalArgumentException error) {
            throw failure(400, "INVALID_RESOURCE_ID", "Invalid resource identifier.");
        }
    }

    private static ApplicationSubmissionException missing() {
        return failure(404, "RESOURCE_NOT_FOUND", "Application not found.");
    }

    private static ApplicationSubmissionException denied() {
        return failure(403, "ACCESS_DENIED", "Access denied.");
    }
}
