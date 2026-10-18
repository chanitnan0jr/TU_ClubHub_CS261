package com.tu.clubhub.club.dto;

import java.util.List;

/** Whitelisted public projection of an active club profile. */
public record PublicClubProfileDto(
        String id,
        String name,
        String description,
        String objectives,
        String contactUrl,
        String facebookUrl,
        String instagramUrl,
        String contactEmail,
        String affiliationLevel,
        String affiliationName,
        String imageUrl,
        String bannerUrl,
        PublicClubCategoryDto category,
        List<PublicClubTagDto> tags) {

    public PublicClubProfileDto {
        tags = List.copyOf(tags);
    }
}
