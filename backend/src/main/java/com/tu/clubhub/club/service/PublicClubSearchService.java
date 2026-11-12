package com.tu.clubhub.club.service;

import com.tu.clubhub.club.dto.PublicClubSearchPageDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import com.tu.clubhub.club.repository.PublicClubSearchRepository;
import com.tu.clubhub.club.repository.PublicClubSearchRepository.Criteria;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicClubSearchService {
    private final PublicClubSearchRepository repository;
    private final Clock clock;

    public PublicClubSearchService(PublicClubSearchRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PublicClubSearchPageDto search(String q, String categoryId, String tagId,
                                           String recruitmentStatus, int page, int size, String sort) {
        if (q != null && q.codePointCount(0, q.length()) > 200) invalid("q", "Must be at most 200 characters");
        String query = q == null || q.isBlank() ? null : q.strip();
        Long category = parseId(categoryId, "categoryId");
        Long tag = parseId(tagId, "tagId");
        if (!recruitmentStatus.equals("ALL") && !recruitmentStatus.equals("OPEN") && !recruitmentStatus.equals("CLOSED")) {
            invalid("recruitmentStatus", "Must be ALL, OPEN, or CLOSED");
        }
        if (page < 0) invalid("page", "Must be zero or greater");
        if (size < 1 || size > 100) invalid("size", "Must be between 1 and 100");
        if (!sort.equals("name,asc") && !sort.equals("name,desc")) invalid("sort", "Must be name,asc or name,desc");

        var result = repository.search(new Criteria(query, category, tag, recruitmentStatus, sort,
                clock.instant(), size, (long) page * size));
        long pages = result.total() == 0 ? 0 : (result.total() + size - 1) / size;
        return new PublicClubSearchPageDto(result.items(), new PublicPageMetadataDto(page, size, result.total(), pages));
    }

    private static Long parseId(String raw, String field) {
        if (raw == null) return null;
        if (!raw.matches("[0-9]{1,19}")) invalid(field, "Must be a positive decimal integer");
        try {
            long id = Long.parseLong(raw);
            if (id > 0) return id;
        } catch (NumberFormatException ignored) {
            // Too large for a signed database bigint.
        }
        invalid(field, "Must be a positive decimal integer");
        return null;
    }

    private static void invalid(String field, String message) {
        throw new ClubValidationException(Map.of(field, message));
    }
}
