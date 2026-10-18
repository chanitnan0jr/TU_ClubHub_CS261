package com.tu.clubhub.recruitment.service;

import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import com.tu.clubhub.recruitment.repository.RecruitmentRoundRepository;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
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

    // ใช้ตรวจข้อมูลก่อนสร้างหรือแก้ไขรอบ
    public void validateDates(Long clubId, RoundWriteRequest request) {
        requireCommittee(clubId);

        if (request == null) {
            throw badRequest("Request body is required");
        }

        var violations = validator.validate(request);

        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        // เปรียบเทียบเวลาจริง แม้ข้อมูลส่งมาคนละ timezone
        Instant opensAt = request.opensAt().toInstant();
        Instant closesAt = request.closesAt().toInstant();
        Instant deadline = request.confirmationDeadline().toInstant();

        if (!opensAt.isBefore(closesAt)) {
            throw badRequest("Opening time must precede closing time");
        }

        if (!deadline.isAfter(closesAt)) {
            throw badRequest(
                    "Confirmation deadline must follow closing time");
        }

        if (request.resultsScheduledAt() != null) {
            Instant resultsAt =
                    request.resultsScheduledAt().toInstant();

            if (resultsAt.isBefore(opensAt)
                    || !resultsAt.isBefore(deadline)) {
                throw badRequest(
                        "Results schedule must be within [opensAt, deadline)");
            }
        }
    }

    @Transactional
    public RecruitmentRound closeRound(
            Long clubId,
            Long roundId,
            Long expectedVersion) {

        requireCommittee(clubId);

        if (roundId == null || roundId <= 0) {
            throw badRequest("roundId must be positive");
        }

        if (expectedVersion == null || expectedVersion < 0) {
            throw badRequest("A non-negative version is required");
        }

        RecruitmentRound round = repository
                .findForUpdate(clubId, roundId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recruitment round not found in this club"));

        if (!expectedVersion.equals(round.version())) {
            throw conflict("Round was modified; reload before retrying");
        }

        if (!"PUBLISHED".equals(round.publicationStatus())) {
            throw conflict("Only published rounds can be closed");
        }

        // ปิดแล้วให้คืนข้อมูลเดิม ไม่เปลี่ยนเวลาปิดซ้ำ
        if (round.closedAt() != null) {
            return round;
        }

        Instant now = clock.instant();

        if (now.isBefore(round.opensAt())) {
            throw conflict("Round has not opened yet");
        }

        if (!now.isBefore(round.closesAt())) {
            throw conflict("Round has already reached its closing time");
        }

        int updated = repository.closeRound(
                clubId, roundId, expectedVersion, now);

        if (updated != 1) {
            throw conflict("Round could not be closed; reload and retry");
        }

        return repository.findForUpdate(clubId, roundId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recruitment round not found"));
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

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(
                HttpStatus.CONFLICT, message);
    }
}