package com.tu.clubhub.application.dto;

import com.tu.clubhub.application.dto.CommitteeClubApplicationSummary.Applicant;
import java.time.Instant;
import java.util.List;

/** Read-only selection view: excludes reviews, decision actors, audit reasons and internal notes. */
public record CommitteeClubApplicationDetail(String id, String clubId, String roundId,
        Applicant applicant, String motivation, List<QuestionAnswer> questionsWithAnswers,
        List<DocumentLink> links, String status, Instant submittedAt) {
    public CommitteeClubApplicationDetail {
        questionsWithAnswers = List.copyOf(questionsWithAnswers);
        links = List.copyOf(links);
    }
    public record QuestionAnswer(String questionId, String questionText, boolean isRequired,
            int displayOrder, String answerText) {}
    public record DocumentLink(String id, String label, String url, int displayOrder) {}
}
