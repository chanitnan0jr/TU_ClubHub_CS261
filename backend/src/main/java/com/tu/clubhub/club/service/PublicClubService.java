package com.tu.clubhub.club.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;


import com.tu.clubhub.club.dto.PublicClubSearchItemDto;
import com.tu.clubhub.club.dto.PublicClubSearchPageDto;
import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.OpenPublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicClubProfileDto;
import com.tu.clubhub.club.dto.PublicClubTagDto;
import com.tu.clubhub.club.dto.PublicItemListDto;
import com.tu.clubhub.club.dto.PublicOpenCallDto;
import com.tu.clubhub.club.dto.PublicOpenCallPageDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import com.tu.clubhub.club.dto.PublicRecruitmentRoundPageDto;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;

@Service
public class PublicClubService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ClubRepository clubRepository;
    private final ClubProfileQueryRepository profileQueryRepository;
    private final Clock clock;

    public PublicClubService(
            ClubRepository clubRepository,
            ClubProfileQueryRepository profileQueryRepository,
            Clock clock
    ) {
        this.clubRepository = clubRepository;
        this.profileQueryRepository = profileQueryRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PublicClubProfileDto getClubProfile(String rawId) {
        Club club = findActiveClub(parseId(rawId));
        var category = profileQueryRepository.findCategory(club.getCategoryId());
        if (category == null) {
            // An active club's required category should be guaranteed by the FK.
            throw new IllegalStateException("Active club has no category");
        }

        List<PublicClubTagDto> tags = profileQueryRepository.findTags(club.getId())
                .stream()
                .map(tag -> new PublicClubTagDto(tag.id(), tag.name()))
                .toList();

        return new PublicClubProfileDto(
                club.getId().toString(),
                club.getName(),
                club.getDescription(),
                club.getObjectives(),
                club.getContactUrl(),
                club.getFacebookUrl(),
                club.getInstagramUrl(),
                club.getContactEmail(),
                club.getAffiliationLevel(),
                club.getAffiliationName(),
                club.getImageUrl(),
                club.getBannerUrl(),
                new PublicClubCategoryDto(category.id(), category.name()),
                tags
        );
    }

    @Transactional(readOnly = true)
    public PublicRecruitmentRoundPageDto getOpenRecruitmentRounds(
            String rawId,
            int page,
            int size
    ) {
        Club club = findActiveClub(parseId(rawId));
        validatePage(page, size);

        // One instant is shared by both the page query and total count.
        Instant now = clock.instant();
        long offset = (long) page * size;
        List<OpenPublicRecruitmentRoundDto> items =
                profileQueryRepository.findOpenPublicRounds(club.getId(), now, size, offset);
        long totalElements = profileQueryRepository.countOpenPublicRounds(club.getId(), now);

        return new PublicRecruitmentRoundPageDto(items, pageMetadata(page, size, totalElements));
    }

    /** Open Call Board: rounds open now across every ACTIVE club, soonest deadline first. */
    @Transactional(readOnly = true)
    public PublicOpenCallPageDto getOpenCalls(int page, int size) {
        validatePage(page, size);

        // One instant is shared by both the page query and total count.
        Instant now = clock.instant();
        long offset = (long) page * size;
        List<PublicOpenCallDto> items = profileQueryRepository.findOpenCalls(now, size, offset);
        long totalElements = profileQueryRepository.countOpenCalls(now);

        return new PublicOpenCallPageDto(items, pageMetadata(page, size, totalElements));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicClubSearchPageDto searchPublicClubs(
            String q,
            String rawCategoryId,
            String rawTagId,
            String recruitmentStatus,
            int page,
            int size,
            String sort
    ) {
        validatePage(page, size);

        if (q != null && q.codePointCount(0, q.length()) > 200) {
            throw new ClubValidationException(
                    Map.of("q", "Must not exceed 200 characters"));
        }

        String normalizedQ = q == null ? null : q.strip();

        if (normalizedQ != null && normalizedQ.isEmpty()) {
            normalizedQ = null;
        }

        Long categoryId = parseOptionalFilterId(
                rawCategoryId, "categoryId");

        Long tagId = parseOptionalFilterId(
                rawTagId, "tagId");

        String status = recruitmentStatus == null
                ? "ALL" : recruitmentStatus;

        if (!Set.of("ALL", "OPEN", "CLOSED").contains(status)) {
            throw new ClubValidationException(
                    Map.of("recruitmentStatus",
                            "Must be ALL, OPEN or CLOSED"));
        }

        String sortOrder = sort == null ? "name,asc" : sort;

        if (!Set.of("name,asc", "name,desc").contains(sortOrder)) {
            throw new ClubValidationException(
                    Map.of("sort",
                            "Must be name,asc or name,desc"));
        }

        boolean descending = "name,desc".equals(sortOrder);

        Instant now = clock.instant();
        long offset = (long) page * size;

        List<PublicClubSearchItemDto> items =
                profileQueryRepository.searchPublicClubs(
                        normalizedQ,
                        categoryId,
                        tagId,
                        status,
                        now,
                        descending,
                        size,
                        offset
                );

        long totalElements =
                profileQueryRepository.countPublicClubs(
                        normalizedQ,
                        categoryId,
                        tagId,
                        status,
                        now
                );

        return new PublicClubSearchPageDto(
                items,
                pageMetadata(page, size, totalElements)
        );
    }

    @Transactional(readOnly = true)
    public PublicItemListDto<PublicClubCategoryDto> listCategories() {
        return new PublicItemListDto<>(profileQueryRepository.findAllCategories());
    }

    @Transactional(readOnly = true)
    public PublicItemListDto<PublicClubTagDto> listTags() {
        return new PublicItemListDto<>(profileQueryRepository.findAllTags());
    }

    private static PublicPageMetadataDto pageMetadata(int page, int size, long totalElements) {
        long totalPages = totalElements == 0 ? 0 : (totalElements + size - 1) / size;
        return new PublicPageMetadataDto(page, size, totalElements, totalPages);
    }

    private Club findActiveClub(Long id) {
        return clubRepository.findByIdAndStatus(id, "ACTIVE")
                .orElseThrow(ClubNotFoundException::new);
    }

    private static Long parseId(String rawId) {
        if (rawId == null || !rawId.matches("[0-9]{1,19}")) {
            throw new InvalidPublicClubIdException();
        }
        try {
            long id = Long.parseLong(rawId);
            if (id <= 0) {
                throw new InvalidPublicClubIdException();
            }
            return id;
        } catch (NumberFormatException exception) {
            throw new InvalidPublicClubIdException();
        }
    }

    private static Long parseOptionalFilterId(
        String rawId,
        String fieldName
) {
    if (rawId == null) {
        return null;
    }

        if (!rawId.matches("[1-9][0-9]{0,18}")) {
            throw new ClubValidationException(
                    Map.of(fieldName, "Must be a positive integer"));
        }

    try {
        long id = Long.parseLong(rawId);

        if (id <= 0) {
            throw new NumberFormatException();
        }

        return id;
    } catch (NumberFormatException exception) {
        throw new ClubValidationException(
                Map.of(fieldName, "Must be a positive integer"));
    }
}

    private static void validatePage(int page, int size) {
        if (page < 0) {
            throw new ClubValidationException(Map.of("page", "Must be zero or greater"));
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ClubValidationException(Map.of(
                    "size", "Must be between 1 and " + MAX_PAGE_SIZE));
        }
    }

    public static class InvalidPublicClubIdException extends RuntimeException {
        public InvalidPublicClubIdException() {
            super("Club ID must be a positive decimal integer");
        }
    }
}
