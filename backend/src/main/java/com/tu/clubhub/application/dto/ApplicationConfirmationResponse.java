package com.tu.clubhub.application.dto;

import java.time.Instant;

public record ApplicationConfirmationResponse(
        String applicationId,
        String clubId,
        String roundId,
        String status,
        String displayStatusLabel,
        Instant respondedAt,
        String membershipId,
        boolean idempotentReplay
) {}
