package com.tu.clubhub.application.dto;

import com.tu.clubhub.application.dto.CommitteeClubApplicationSummary.Applicant;
import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail.DocumentLink;
import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail.QuestionAnswer;
import java.time.Instant;
import java.util.List;

/** Evaluation editor/write projection. Never reuse this for applicant or Task65 read APIs. */
public record CommitteeApplicationDetail(String id, String clubId, String roundId, Applicant applicant,
        String motivation, List<QuestionAnswer> questionsWithAnswers, List<DocumentLink> links, String status,
        String resultMessage, String decidedBy, Instant decidedAt, Instant respondedAt, long version,
        Instant submittedAt, List<Review> reviews, List<History> statusHistory) {
    public CommitteeApplicationDetail {
        questionsWithAnswers = List.copyOf(questionsWithAnswers); links = List.copyOf(links);
        reviews = List.copyOf(reviews); statusHistory = List.copyOf(statusHistory);
    }
    public record Review(String id, String reviewerId, String reviewerDisplayName, String recommendation,
            String internalComment, Instant createdAt, Instant updatedAt, long version) {}
    public record History(String fromStatus, String toStatus, String actorId, String reason, Instant changedAt) {}
}
