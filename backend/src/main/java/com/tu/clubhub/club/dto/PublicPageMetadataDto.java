package com.tu.clubhub.club.dto;

/** Pagination metadata following the shared API collection contract. */
public record PublicPageMetadataDto(
        int number,
        int size,
        long totalElements,
        long totalPages) {
}
