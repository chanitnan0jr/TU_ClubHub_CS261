package com.tu.clubhub.application.dto;

import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import java.time.Instant;
import java.util.List;

/**
 * Applicant-safe response for GET /api/v1/me/applications.
 * Internal application statuses and committee reviews are not exposed.
 */
public record ApplicantApplicationPage(
        List<Item> items,
        PublicPageMetadataDto page) {

    public record Item(
            String id,
            ClubSummary club,
            RoundSummary round,
            Instant submittedAt,
            VisibleStatus applicantVisibleStatus,
            String displayStatusLabel,
            boolean canConfirm,
            boolean canDecline,
            Instant respondedAt) {
    }

    public record ClubSummary(
            String id,
            String name,
            String imageUrl) {
    }

    public record RoundSummary(
            String id,
            String title,
            int academicYear,
            int semester,
            Instant opensAt,
            Instant closesAt,
            Instant resultsPublishedAt,
            Instant confirmationDeadline) {
    }

    public enum VisibleStatus {
        SUBMITTED,
        ACCEPTED_PENDING_CONFIRMATION,
        REJECTED,
        CONFIRMED,
        DECLINED,
        EXPIRED,
        WITHDRAWN
    }
}
