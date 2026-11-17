package com.tu.clubhub.common.dto;

import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import java.util.List;

/** Shared paginated response envelope matching the collection contract. */
public record PageResponse<T>(List<T> items, PublicPageMetadataDto page) {
    public PageResponse {
        items = List.copyOf(items);
    }

    public static <T> PageResponse<T> of(List<T> items, int page, int size, long totalElements) {
        return new PageResponse<>(items, metadata(page, size, totalElements));
    }

    public static PublicPageMetadataDto metadata(int page, int size, long totalElements) {
        long totalPages = totalElements == 0 ? 0 : (totalElements + size - 1) / size;
        return new PublicPageMetadataDto(page, size, totalElements, totalPages);
    }
}
