package com.tu.clubhub.application.dto;

import java.time.Instant;
import java.util.List;

/** Applicant-facing form (API_v1.md section 12); never the committee round DTO. */
public record RoundApplicationForm(Round round, List<TextQuestion> questions) {
    public record Round(String id, String clubId, String title, String description,
            String eligibilityText, Instant opensAt, Instant closesAt) {}

    public record TextQuestion(String id, String type, String questionText, boolean isRequired,
            int displayOrder, int maxLength) {}
}
