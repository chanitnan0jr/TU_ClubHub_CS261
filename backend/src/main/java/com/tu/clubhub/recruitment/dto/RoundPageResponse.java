package com.tu.clubhub.recruitment.dto;

import java.util.List;

/** Committee page of rounds, shaped as the RoundPage schema in rounds.openapi.yaml. */
public record RoundPageResponse(
    List<RoundResponse> items,
    int page,
    int size,
    long totalElements,
    int totalPages
) {
    public RoundPageResponse {
        items = List.copyOf(items);
    }
}
