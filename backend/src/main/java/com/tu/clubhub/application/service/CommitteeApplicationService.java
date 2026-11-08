package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail;
import com.tu.clubhub.application.dto.CommitteeClubApplicationPage;
import com.tu.clubhub.application.repository.CommitteeApplicationRepository;
import com.tu.clubhub.application.repository.CommitteeApplicationRepository.Filter;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import java.util.List;
import java.util.Set;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** US-09 reads only; a stable snapshot keeps permission, count and page/detail consistent. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CommitteeApplicationService {
    private static final Set<String> STATUSES = Set.of("SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED",
            "CONFIRMED", "DECLINED", "WITHDRAWN", "EXPIRED");
    private final CommitteeApplicationRepository repository;
    private final ClubSecurity security;

    public CommitteeApplicationService(CommitteeApplicationRepository repository, ClubSecurity security) {
        this.repository = repository;
        this.security = security;
    }

    public CommitteeClubApplicationPage list(String rawClubId, String rawRoundId, String status, String q, int page, int size) {
        long viewerId = currentUserId();
        long clubId = id(rawClubId);
        requireCommittee(clubId); // Parent authorization precedes all child existence/state checks.
        Long roundId = rawRoundId == null ? null : id(rawRoundId);
        if (status != null && !STATUSES.contains(status)) throw invalid("status");
        if (page < 0) throw invalid("page");
        if (size < 1 || size > 100) throw invalid("size");
        if (q != null && q.codePointCount(0, q.length()) > 200) throw invalid("q");
        String search = q == null || q.isBlank() ? null : q.strip();
        if (roundId != null) requireRound(clubId, roundId, viewerId);
        var filter = new Filter(clubId, viewerId, roundId, status, search);
        long total = repository.count(filter);
        var items = repository.list(filter, page, size);
        return new CommitteeClubApplicationPage(items, new CommitteeClubApplicationPage.Page(page, size, total,
                total / size + (total % size == 0 ? 0 : 1)));
    }

    public CommitteeClubApplicationDetail detail(String rawClubId, String rawApplicationId) {
        long viewerId = currentUserId();
        long clubId = id(rawClubId);
        requireCommittee(clubId);
        long applicationId = id(rawApplicationId);
        var scope = repository.findApplicationScope(applicationId).orElseThrow(CommitteeApplicationService::missing);
        if (scope.clubId() != clubId) throw denied();
        requireRound(clubId, scope.roundId(), viewerId);
        var row = repository.findDetail(clubId, applicationId).orElseThrow(CommitteeApplicationService::missing);
        var summary = row.summary();
        return new CommitteeClubApplicationDetail(summary.id(), Long.toString(clubId), summary.roundId(), summary.applicant(),
                row.motivation(), repository.questionsWithAnswers(scope.roundId(), applicationId), repository.links(applicationId),
                summary.status(), summary.submittedAt());
    }

    private void requireRound(long clubId, long roundId, long viewerId) {
        var round = repository.findRound(roundId).orElseThrow(CommitteeApplicationService::missing);
        if (round.clubId() != clubId || repository.isApplicant(viewerId, roundId)) throw denied();
        if ("CANCELLED".equals(round.publicationStatus())) throw ApplicationSubmissionException.conflict("ROUND_CANCELLED");
        if (!"PUBLISHED".equals(round.publicationStatus()) || !round.published())
            throw ApplicationSubmissionException.conflict("ROUND_NOT_PUBLISHED");
    }

    private void requireCommittee(long clubId) {
        if (!security.isCommittee(clubId)) throw denied();
    }

    private static long id(String raw) {
        try {
            if (raw == null || !raw.matches("[1-9][0-9]{0,18}")) throw new IllegalArgumentException();
            return Long.parseLong(raw);
        } catch (IllegalArgumentException exception) {
            throw ApplicationSubmissionException.failure(400, "INVALID_RESOURCE_ID", "Invalid resource identifier.");
        }
    }

    private static long currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken
                || !(auth.getPrincipal() instanceof ClubHubPrincipal principal)
                || principal.userId() == null || principal.userId() <= 0)
            throw ApplicationSubmissionException.failure(401, "AUTHENTICATION_REQUIRED", "Sign in to access this resource.");
        return ((ClubHubPrincipal) auth.getPrincipal()).userId();
    }

    private static ApplicationSubmissionException denied() {
        return ApplicationSubmissionException.failure(403, "ACCESS_DENIED", "Access denied.");
    }
    private static ApplicationSubmissionException missing() {
        return ApplicationSubmissionException.failure(404, "RESOURCE_NOT_FOUND", "Resource not found.");
    }
    private static ApplicationSubmissionException invalid(String field) {
        return ApplicationSubmissionException.validation(List.of(new FieldError(field, "INVALID", "Invalid query parameter.")));
    }
}
