
package com.tu.clubhub.club.dto;

import java.util.List;

public record PublicClubSearchPageDto(
        List<PublicClubSearchItemDto> items,
        PublicPageMetadataDto page
) {
}
