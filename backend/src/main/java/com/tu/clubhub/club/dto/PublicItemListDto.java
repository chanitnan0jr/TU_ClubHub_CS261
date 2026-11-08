package com.tu.clubhub.club.dto;

import java.util.List;

/** Complete, unpaginated public list wrapped as {@code {"items": [...]}}. */
public record PublicItemListDto<T>(List<T> items) {

    public PublicItemListDto {
        items = List.copyOf(items);
    }
}
