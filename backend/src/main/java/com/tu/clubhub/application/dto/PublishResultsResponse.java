package com.tu.clubhub.application.dto;

import java.time.Instant;

public record PublishResultsResponse(String roundId, String clubId, Instant resultsPublishedAt,
        Instant confirmationDeadline, long acceptedCount, long rejectedCount, long roundVersion) {}
