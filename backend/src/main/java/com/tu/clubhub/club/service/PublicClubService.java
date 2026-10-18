package com.tu.clubhub.club.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.OpenPublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicClubProfileDto;
import com.tu.clubhub.club.dto.PublicClubTagDto;
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
        long totalPages = totalElements == 0 ? 0 : (totalElements + size - 1) / size;

        return new PublicRecruitmentRoundPageDto(
                items,
                new PublicPageMetadataDto(page, size, totalElements, totalPages)
        );
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
