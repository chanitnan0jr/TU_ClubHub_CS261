package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.ApplicantApplicationDetail;
import com.tu.clubhub.application.dto.ApplicantApplicationDetail.StatusHistoryEntry;
import com.tu.clubhub.application.dto.ApplicantApplicationPage;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.ClubSummary;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.Item;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.PageMetadata;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.RoundSummary;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.VisibleStatus;
import com.tu.clubhub.application.repository.MyApplicationRepository;
import com.tu.clubhub.application.repository.MyApplicationRepository.ApplicationRow;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.user.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class MyApplicationService {

    private final MyApplicationRepository repository;
    private final UserAccountRepository accounts;
    private final Clock clock;

    public MyApplicationService(
            MyApplicationRepository repository,
            UserAccountRepository accounts,
            Clock clock) {

        this.repository = repository;
        this.accounts = accounts;
        this.clock = clock;
    }

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ)
    public ApplicantApplicationPage list(int page, int size) {
        long userId = currentActiveUserId();

        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page must be non-negative and size must be between 1 and 100");
        }

        long total = repository.countByApplicant(userId);
        long offset = (long) page * size;
        Instant now = clock.instant();

        var items = repository.findByApplicant(userId, size, offset)
                .stream()
                .map(row -> summary(row, now))
                .toList();

        long pages = total / size + (total % size == 0 ? 0 : 1);

        return new ApplicantApplicationPage(
                items,
                new PageMetadata(
                        page,
                        size,
                        total,
                        Math.toIntExact(pages)));
    }

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ)
    public ApplicantApplicationDetail detail(String rawApplicationId) {
        long userId = currentActiveUserId();
        long applicationId = positiveId(rawApplicationId);

        ApplicationRow row = repository
                .findOwnedById(applicationId, userId)
                .orElseThrow(() -> {
                    if (repository.existsById(applicationId)) {
                        return new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "You cannot access another user's application");
                    }

                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Application not found");
                });

        Instant now = clock.instant();
        Item item = summary(row, now);

        return new ApplicantApplicationDetail(
                item.id(),
                item.club(),
                item.round(),
                row.motivation(),
                repository.findOwnedQuestionAnswers(applicationId, userId),
                repository.findOwnedLinks(applicationId, userId),
                item.submittedAt(),
                item.applicantVisibleStatus(),
                item.displayStatusLabel(),
                resultsPublished(row, now) ? row.resultMessage() : null,
                item.canConfirm(),
                item.canDecline(),
                item.respondedAt(),
                timeline(row, now));
    }

    private Item summary(ApplicationRow row, Instant now) {
        VisibleStatus visible = visibleStatus(row, now);

        boolean offerOpen =
                "PUBLISHED".equals(row.publicationStatus())
                && "ACCEPTED".equals(row.status())
                && resultsPublished(row, now)
                && row.confirmationDeadline() != null
                && now.isBefore(row.confirmationDeadline());

        boolean canConfirm =
                offerOpen
                && "ACTIVE".equals(row.studentStatus())
                && "ACTIVE".equals(row.clubStatus());

        return new Item(
                Long.toString(row.id()),
                new ClubSummary(
                        Long.toString(row.clubId()),
                        row.clubName(),
                        row.clubImageUrl()),
                new RoundSummary(
                        Long.toString(row.roundId()),
                        row.roundTitle(),
                        row.academicYear(),
                        row.semester(),
                        row.opensAt(),
                        row.closesAt(),
                        resultsPublished(row, now)
                                ? row.resultsPublishedAt()
                                : null,
                        resultsPublished(row, now)
                                ? row.confirmationDeadline()
                                : null),
                row.submittedAt(),
                visible,
                label(visible),
                canConfirm,
                offerOpen,
                resultsPublished(row, now)
                        ? row.respondedAt()
                        : null);
    }

    private VisibleStatus visibleStatus(
            ApplicationRow row,
            Instant now) {

        if ("WITHDRAWN".equals(row.status())) {
            return VisibleStatus.WITHDRAWN;
        }

        if (!resultsPublished(row, now)) {
            return VisibleStatus.SUBMITTED;
        }

        return switch (row.status()) {
            case "SUBMITTED", "UNDER_REVIEW" ->
                    VisibleStatus.SUBMITTED;

            case "ACCEPTED" ->
                    row.confirmationDeadline() != null
                            && !now.isBefore(row.confirmationDeadline())
                            ? VisibleStatus.EXPIRED
                            : VisibleStatus.ACCEPTED_PENDING_CONFIRMATION;

            case "REJECTED" -> VisibleStatus.REJECTED;
            case "CONFIRMED" -> VisibleStatus.CONFIRMED;
            case "DECLINED" -> VisibleStatus.DECLINED;
            case "EXPIRED" -> VisibleStatus.EXPIRED;

            default -> throw new IllegalStateException(
                    "Unsupported application status");
        };
    }

    private List<StatusHistoryEntry> timeline(
            ApplicationRow row,
            Instant now) {

        var entries = new ArrayList<StatusHistoryEntry>();

        entries.add(event(
                VisibleStatus.SUBMITTED,
                row.submittedAt()));

        if ("WITHDRAWN".equals(row.status())) {
            Instant withdrawnAt = repository
                    .findOwnedWithdrawalTime(row.id(), row.applicantId())
                    .orElse(row.updatedAt() != null ? row.updatedAt() : row.submittedAt());

            entries.add(event(VisibleStatus.WITHDRAWN, withdrawnAt));
        } else if (resultsPublished(row, now)) {
            switch (row.status()) {
                case "ACCEPTED", "CONFIRMED", "DECLINED", "EXPIRED" ->
                        entries.add(event(
                                VisibleStatus.ACCEPTED_PENDING_CONFIRMATION,
                                row.resultsPublishedAt()));

                case "REJECTED" ->
                        entries.add(event(
                                VisibleStatus.REJECTED,
                                row.resultsPublishedAt()));

                default -> {
                    // Internal review events are never returned.
                }
            }

            switch (row.status()) {
                case "CONFIRMED" ->
                        entries.add(event(
                                VisibleStatus.CONFIRMED,
                                row.respondedAt()));

                case "DECLINED" ->
                        entries.add(event(
                                VisibleStatus.DECLINED,
                                row.respondedAt()));

                case "EXPIRED" ->
                        entries.add(event(
                                VisibleStatus.EXPIRED,
                                row.confirmationDeadline()));

                case "ACCEPTED" -> {
                    if (visibleStatus(row, now) == VisibleStatus.EXPIRED) {
                        entries.add(event(
                                VisibleStatus.EXPIRED,
                                row.confirmationDeadline()));
                    }
                }

                default -> {
                }
            }
        }

        entries.sort(Comparator.comparing(
                StatusHistoryEntry::occurredAt));

        return List.copyOf(entries);
    }

    private StatusHistoryEntry event(
            VisibleStatus status,
            Instant occurredAt) {

        if (occurredAt == null) {
            throw new IllegalStateException(
                    "Required application event timestamp is missing");
        }

        return new StatusHistoryEntry(
                status,
                timelineLabel(status),
                occurredAt);
    }

    private boolean resultsPublished(
            ApplicationRow row,
            Instant now) {

        return row.resultsPublishedAt() != null
                && !now.isBefore(row.resultsPublishedAt());
    }

    private String label(VisibleStatus status) {
        return switch (status) {
            case SUBMITTED -> "รอพิจารณา";
            case ACCEPTED_PENDING_CONFIRMATION ->
                    "ผ่านการคัดเลือก (รอยืนยันสิทธิ์)";
            case REJECTED -> "ไม่ผ่านการคัดเลือก";
            case CONFIRMED -> "ยืนยันสิทธิ์แล้ว";
            case DECLINED -> "สละสิทธิ์";
            case EXPIRED -> "สละสิทธิ์ (หมดเวลาตอบรับ)";
            case WITHDRAWN -> "ถอนใบสมัครแล้ว";
        };
    }

    private String timelineLabel(VisibleStatus status) {
        return switch (status) {
            case SUBMITTED -> "ส่งใบสมัครแล้ว";
            case ACCEPTED_PENDING_CONFIRMATION ->
                    "ประกาศผลคัดเลือก (ผ่านการคัดเลือก)";
            case REJECTED -> "ประกาศผลคัดเลือก (ไม่ผ่านการคัดเลือก)";
            default -> label(status);
        };
    }

    private long positiveId(String rawId) {
        if (rawId == null || !rawId.matches("[1-9][0-9]{0,18}")) {
            throw invalidId();
        }

        try {
            long id = Long.parseLong(rawId);

            if (id <= 0) {
                throw invalidId();
            }

            return id;
        } catch (NumberFormatException exception) {
            throw invalidId();
        }
    }

    private ResponseStatusException invalidId() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "applicationId must be a positive BIGINT");
    }

    private long currentActiveUserId() {
        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal()
                        instanceof ClubHubPrincipal principal)
                || principal.userId() == null
                || principal.userId() <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Sign in to view your applications");
        }

        String status = accounts
                .findAccountStatusById(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "A valid account is required"));

        if (!"ACTIVE".equals(status)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This account is not allowed to use TU-ClubHub");
        }

        return principal.userId();
    }
}