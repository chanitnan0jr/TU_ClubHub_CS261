package com.tu.clubhub.club.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.tu.clubhub.club.repository.PublicClubSearchRepository;
import com.tu.clubhub.club.repository.PublicClubSearchRepository.Criteria;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class PublicClubSearchServiceTest {
    private final PublicClubSearchRepository repository = Mockito.mock(PublicClubSearchRepository.class);
    private final Instant now = Instant.parse("2026-10-20T09:30:00Z");
    private final PublicClubSearchService service = new PublicClubSearchService(repository,
            Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void normalizesFiltersAndUsesOneEvaluationTime() {
        when(repository.search(any())).thenReturn(new PublicClubSearchRepository.Result(List.of(), 21));
        var result = service.search("  กีฬา  ", "12", "34", "OPEN", 2, 10, "name,desc");
        var criteria = ArgumentCaptor.forClass(Criteria.class);
        verify(repository).search(criteria.capture());
        assertEquals(new Criteria("กีฬา", 12L, 34L, "OPEN", "name,desc", now, 10, 20), criteria.getValue());
        assertEquals(3, result.page().totalPages());
    }

    @Test
    void whitespaceSearchIsOmitted() {
        when(repository.search(any())).thenReturn(new PublicClubSearchRepository.Result(List.of(), 0));
        service.search("  ", null, null, "ALL", 0, 20, "name,asc");
        var criteria = ArgumentCaptor.forClass(Criteria.class);
        verify(repository).search(criteria.capture());
        assertNull(criteria.getValue().query());
    }

    @Test
    void rejectsInvalidFiltersBeforeQuerying() {
        assertThrows(ClubValidationException.class,
                () -> service.search(null, null, "9223372036854775808", "ALL", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.search(null, null, null, "ALL", 0, 101, "name,asc"));
        verify(repository, never()).search(any());
    }
}
