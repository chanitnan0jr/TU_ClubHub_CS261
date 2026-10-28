package com.tu.clubhub.application.dto;

import java.time.Instant;

/** Applicant-visible submission receipt; never includes internal decisions or reviews. */
public record ApplicationSubmission(
        String id, String clubId, String roundId, String status, Instant submittedAt) {
}
