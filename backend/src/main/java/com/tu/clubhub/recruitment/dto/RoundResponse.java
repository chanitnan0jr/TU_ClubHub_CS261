package com.tu.clubhub.recruitment.dto;

import java.time.Instant;
import java.util.List;

import com.tu.clubhub.recruitment.domain.RecruitmentRound;

/** Committee view of a round, shaped as the Round schema in rounds.openapi.yaml. */
public record RoundResponse(
    String id,
    String clubId,
    String title,
    Integer academicYear,
    Integer semester,
    String description,
    String eligibilityText,
    Instant opensAt,
    Instant closesAt,
    Instant confirmationDeadline,
    Instant resultsScheduledAt,
    String publicationStatus,
    Instant closedAt,
    Instant publishedAt,
    Instant resultsPublishedAt,
    Instant createdAt,
    Instant updatedAt,
    Long version,
    List<Question> questions
) {
    public record Question(
        String id,
        String prompt,
        boolean required,
        int displayOrder,
        int maxLength
    ) {}

    public static RoundResponse from(RecruitmentRound round, List<Question> questions) {
        return new RoundResponse(
            round.id().toString(),
            round.clubId().toString(),
            round.title(),
            round.academicYear(),
            round.semester(),
            round.description(),
            round.eligibilityText(),
            round.opensAt(),
            round.closesAt(),
            round.confirmationDeadline(),
            round.resultsScheduledAt(),
            round.publicationStatus(),
            round.closedAt(),
            round.publishedAt(),
            round.resultsPublishedAt(),
            round.createdAt(),
            round.updatedAt(),
            round.version(),
            List.copyOf(questions));
    }
}
