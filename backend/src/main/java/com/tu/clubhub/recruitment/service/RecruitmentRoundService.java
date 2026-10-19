package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import com.tu.clubhub.recruitment.repository.RecruitmentRoundRepository;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;

@Service
public class RecruitmentRoundService {

    private final RecruitmentRoundRepository repository;
    private final ClubSecurity clubSecurity;
    private final Clock clock;
    private final Validator validator;

    public RecruitmentRoundService(
            RecruitmentRoundRepository repository,
            ClubSecurity clubSecurity,
            Clock clock,
            Validator validator) {

        this.repository = repository;
        this.clubSecurity = clubSecurity;
        this.clock = clock;
        this.validator = validator;
    }

    public void validateDates(
            Long clubId,
            RoundWriteRequest request) {

        requireCommittee(clubId);
        validateRequest(request);
    }

    @Transactional
    public RecruitmentRound createRound(
            Long clubId,
            RoundWriteRequest request) {

        requireCommittee(clubId);
        validateRequest(request, RoundWriteRequest.Create.class);

        Long createdBy = currentUserId();

        Long roundId = repository.createRound(
                clubId,
                createdBy,
                request,
                clock.instant());

        repository.insertQuestions(roundId, request.questions());

        return findRound(clubId, roundId);
    }

    @Transactional
    public RecruitmentRound updateRound(
            Long clubId,
            Long roundId,
            RoundWriteRequest request) {

        requireCommittee(clubId);
        requireRoundId(roundId);
        validateRequest(request, RoundWriteRequest.Replace.class);

        RecruitmentRound round = findRound(clubId, roundId);

        requireVersion(round, request.version());

        if (!"DRAFT".equals(round.publicationStatus())
                || round.closedAt() != null) {
            throw conflict("Only draft rounds can be edited");
        }

        if (repository.hasApplications(roundId)) {
            throw conflict(
                    "Rounds with applications cannot be replaced");
        }

        int updated = repository.updateDraft(
                clubId,
                roundId,
                request,
                clock.instant());

        if (updated != 1) {
            throw conflict(
                    "Round was modified; reload before retrying");
        }

        repository.deleteQuestions(roundId);
        repository.insertQuestions(roundId, request.questions());

        return findRound(clubId, roundId);
    }

    @Transactional
    public RecruitmentRound publishRound(
            Long clubId,
            Long roundId,
            Long expectedVersion) {

        requireCommittee(clubId);
        requireRoundId(roundId);
        requireExpectedVersion(expectedVersion);

        RecruitmentRound round = findRound(clubId, roundId);

        requireVersion(round, expectedVersion);

        if (!"DRAFT".equals(round.publicationStatus())
                || round.closedAt() != null) {
            throw conflict("Only draft rounds can be published");
        }

        validateTimeline(
                round.opensAt(),
                round.closesAt(),
                round.confirmationDeadline(),
                round.resultsScheduledAt());

        Instant now = clock.instant();

        if (!now.isBefore(round.closesAt())) {
            throw conflict(
                    "Cannot publish a round whose closing time has passed");
        }

        int updated = repository.publishRound(
                clubId,
                roundId,
                expectedVersion,
                now);

        if (updated != 1) {
            throw conflict(
                    "Round could not be published; reload and retry");
        }

        return findRound(clubId, roundId);
    }

    @Transactional
    public RecruitmentRound closeRound(
            Long clubId,
            Long roundId,
            Long expectedVersion) {

        requireCommittee(clubId);
        requireRoundId(roundId);
        requireExpectedVersion(expectedVersion);

        RecruitmentRound round = findRound(clubId, roundId);

        requireVersion(round, expectedVersion);

        if (!"PUBLISHED".equals(round.publicationStatus())) {
            throw conflict("Only published rounds can be closed");
        }

        if (round.closedAt() != null) {
            throw conflict("Round has already been closed");
        }

        Instant now = clock.instant();

        if (now.isBefore(round.opensAt())) {
            throw conflict("Round has not opened yet");
        }

        if (!now.isBefore(round.closesAt())) {
            throw conflict(
                    "Round has already reached its closing time");
        }

        int updated = repository.closeRound(
                clubId,
                roundId,
                expectedVersion,
                now);

        if (updated != 1) {
            throw conflict(
                    "Round could not be closed; reload and retry");
        }

        return findRound(clubId, roundId);
    }

    private void validateRequest(
            RoundWriteRequest request,
            Class<?>... groups) {

        if (request == null) {
            throw badRequest("Request body is required");
        }

        var violations = validator.validate(request, groups);

        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        validateTimeline(
                request.opensAt().toInstant(),
                request.closesAt().toInstant(),
                request.confirmationDeadline().toInstant(),
                request.resultsScheduledAt() == null
                        ? null
                        : request.resultsScheduledAt().toInstant());
    }

    private void validateTimeline(
            Instant opensAt,
            Instant closesAt,
            Instant deadline,
            Instant resultsAt) {

        if (opensAt == null || closesAt == null || deadline == null) {
            throw badRequest(
                    "Opening, closing and confirmation times are required");
        }

        if (!opensAt.isBefore(closesAt)) {
            throw badRequest(
                    "Opening time must precede closing time");
        }

        if (!deadline.isAfter(closesAt)) {
            throw badRequest(
                    "Confirmation deadline must follow closing time");
        }

        if (resultsAt != null
                && (resultsAt.isBefore(opensAt)
                || !resultsAt.isBefore(deadline))) {
            throw badRequest(
                    "Results schedule must be within [opensAt, deadline)");
        }
    }

    private RecruitmentRound findRound(Long clubId, Long roundId) {
        return repository.findForUpdate(clubId, roundId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recruitment round not found in this club"));
    }

    private Long currentUserId() {
        var authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal()
                instanceof ClubHubPrincipal principal)
                || principal.userId() == null) {
            throw new AccessDeniedException(
                    "An authenticated ClubHub account is required");
        }

        return principal.userId();
    }

    private void requireCommittee(Long clubId) {
        if (clubId == null || clubId <= 0) {
            throw badRequest("clubId must be positive");
        }

        if (!clubSecurity.isCommittee(clubId)) {
            throw new AccessDeniedException(
                    "You must be an active committee member of this club");
        }
    }

    private void requireRoundId(Long roundId) {
        if (roundId == null || roundId <= 0) {
            throw badRequest("roundId must be positive");
        }
    }

    private void requireExpectedVersion(Long version) {
        if (version == null || version < 0) {
            throw badRequest("A non-negative version is required");
        }
    }

    private void requireVersion(
            RecruitmentRound round,
            Long expectedVersion) {

        if (!expectedVersion.equals(round.version())) {
            throw conflict(
                    "Round was modified; reload before retrying");
        }
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