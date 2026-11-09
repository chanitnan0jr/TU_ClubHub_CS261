package com.tu.clubhub.application.dto;

import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import java.time.Instant;
import java.util.List;

/** Applicant-facing summary, page, and detail views for US-04 (Task64). */
public record ApplicantApplicationSummary(
        String id,
        Club club,
        Round round,
        Instant submittedAt,
        String applicantVisibleStatus,
        String displayStatusLabel,
        boolean canConfirm,
        boolean canDecline,
        Instant respondedAt) {

    public record Club(String id, String name, String imageUrl) {}

    public record Round(
            String id,
            String title,
            int academicYear,
            int semester,
            Instant opensAt,
            Instant closesAt,
            Instant resultsPublishedAt,
            Instant confirmationDeadline) {}

    public record Page(List<ApplicantApplicationSummary> items, PublicPageMetadataDto page) {}

    public record QuestionAnswer(
            String questionId, String questionText, boolean isRequired, int displayOrder, String answerText) {}

    public record DocumentLink(String label, String url, int displayOrder) {}

    public record StatusHistoryEntry(String status, String displayStatusLabel, Instant occurredAt) {}

    public record Detail(
            String id,
            Club club,
            Round round,
            String motivation,
            List<QuestionAnswer> questionsWithAnswers,
            List<DocumentLink> links,
            Instant submittedAt,
            String applicantVisibleStatus,
            String displayStatusLabel,
            String resultMessage,
            boolean canConfirm,
            boolean canDecline,
            Instant respondedAt,
            List<StatusHistoryEntry> statusHistory) {}
}
