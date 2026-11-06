package com.tu.clubhub.club.dto;

import java.time.Instant;

/** Open round on the public Open Call Board, with a safe summary of the recruiting club. */
public record PublicOpenCallDto(
        String id,
        String name,
        String description,
        Instant opensAt,
        Instant closesAt,
        Instant resultsScheduledAt,
        ClubSummary club) {

    /** Only the public club fields a board card needs to render and link to the profile. */
    public record ClubSummary(
            String id,
            String name,
            String imageUrl,
            PublicClubCategoryDto category) {
    }
}
