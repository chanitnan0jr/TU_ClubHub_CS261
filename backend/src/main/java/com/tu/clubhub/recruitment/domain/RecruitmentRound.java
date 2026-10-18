package com.tu.clubhub.recruitment.domain;

import java.time.Instant;

public record RecruitmentRound(
    Long id,
    Long clubId,
    String title,
    Integer academicYear,
    Integer semester,
    String description,
    String eligibilityText,
    Instant opensAt,
    Instant closesAt,
    Instant closedAt,
    Instant resultsScheduledAt,
    Instant confirmationDeadline,
    String publicationStatus,
    Instant publishedAt,
    Instant resultsPublishedAt,
    Long createdBy,
    Instant createdAt,
    Instant updatedAt,
    Long version
) {
}