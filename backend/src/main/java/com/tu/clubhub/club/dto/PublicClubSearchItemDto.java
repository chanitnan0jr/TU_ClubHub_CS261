
package com.tu.clubhub.club.dto;

import java.util.List;
import java.time.Instant;

public record PublicClubSearchItemDto(
        String id,
        String name,
        String description,
        String affiliationLevel,
        String affiliationName,
        String imageUrl,
        PublicClubCategoryDto category,
        List<PublicClubTagDto> tags,
        boolean hasOpenRecruitment,
        Instant lastRecruitmentClosedAt
) {
}
