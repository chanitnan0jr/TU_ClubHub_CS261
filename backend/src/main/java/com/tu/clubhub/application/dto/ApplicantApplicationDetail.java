package com.tu.clubhub.application.dto;

import com.tu.clubhub.application.dto.ApplicantApplicationPage.ClubSummary;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.RoundSummary;
import com.tu.clubhub.application.dto.ApplicantApplicationPage.VisibleStatus;

import java.time.Instant;
import java.util.List;

/**
 * Applicant-owned detail response.
 * Excludes internal reviews, reviewer identities and decision timestamps.
 */
public record ApplicantApplicationDetail(
        String id,
        ClubSummary club,
        RoundSummary round,
        String motivation,
        List<QuestionAnswer> questionsWithAnswers,
        List<DocumentLink> links,
        Instant submittedAt,
        VisibleStatus applicantVisibleStatus,
        String displayStatusLabel,
        String resultMessage,
        boolean canConfirm,
        boolean canDecline,
        Instant respondedAt,
        List<StatusHistoryEntry> statusHistory) {

    public record QuestionAnswer(
            String questionId,
            String questionText,
            boolean isRequired,
            int displayOrder,
            String answerText) {
    }

    public record DocumentLink(
            String label,
            String url,
            int displayOrder) {
    }

    public record StatusHistoryEntry(
            VisibleStatus status,
            String displayStatusLabel,
            Instant occurredAt) {
    }
}