package com.tu.clubhub.club.dto;

import java.util.List;

/** Paginated collection of public rounds that are currently accepting applications. */
public record PublicRecruitmentRoundPageDto(
        List<OpenPublicRecruitmentRoundDto> items,
        PublicPageMetadataDto page) {

    public PublicRecruitmentRoundPageDto {
        items = List.copyOf(items);
    }
}
