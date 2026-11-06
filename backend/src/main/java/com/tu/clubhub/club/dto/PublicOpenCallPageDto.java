package com.tu.clubhub.club.dto;

import java.util.List;

/** Paginated Open Call Board: rounds open now across all active clubs. */
public record PublicOpenCallPageDto(
        List<PublicOpenCallDto> items,
        PublicPageMetadataDto page) {

    public PublicOpenCallPageDto {
        items = List.copyOf(items);
    }
}
