package com.tu.clubhub.club.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubCategoryDto;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubTagDto;
import com.tu.clubhub.club.dto.OpenPublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.PublicClubSearchItemDto;
import com.tu.clubhub.club.dto.PublicOpenCallDto;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import com.tu.clubhub.club.service.PublicClubService.InvalidPublicClubIdException;
import com.tu.clubhub.committee.security.ClubSecurity;

class PublicClubServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private Club activeClub;
    private Club inactiveClub;
    private FixtureQueries queries;
    private AtomicInteger lookups;
    private AtomicInteger clockReads;
    private PublicClubService service;

    @BeforeEach
    void setUp() throws Exception {
        activeClub = new Club(3L, "Coding", "Public summary", 1L);
        setId(activeClub, 7L);
        inactiveClub = new Club(3L, "Inactive", "Hidden", 1L);
        inactiveClub.setStatus("INACTIVE");
        setId(inactiveClub, 8L);
        lookups = new AtomicInteger();
        clockReads = new AtomicInteger();

        ClubRepository clubs = (ClubRepository) Proxy.newProxyInstance(
                ClubRepository.class.getClassLoader(),
                new Class<?>[] {ClubRepository.class},
                (proxy, method, args) -> {
                    if (method.getName().equals("findByIdAndStatus")) {
                        lookups.incrementAndGet();
                        Long id = (Long) args[0];
                        String status = (String) args[1];
                        Club club = id == 7L ? activeClub : id == 8L ? inactiveClub : null;
                        return club != null && status.equals(club.getStatus())
                                ? Optional.of(club) : Optional.empty();
                    }
                    if (method.getName().equals("toString")) {
                        return "ClubRepository test proxy";
                    }
                    throw new UnsupportedOperationException(method.getName());
                });

        queries = new FixtureQueries();
        Clock clock = new Clock() {
            @Override public ZoneId getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { clockReads.incrementAndGet(); return NOW; }
        };

        service = new PublicClubService(clubs, queries, clock, mock(ClubSecurity.class));
    }

    @Test
    void returnsWhitelistedProfileForActiveClub() {
        var result = service.getClubProfile("7");
        assertEquals("7", result.id());
        assertEquals("Coding", result.name());
        assertEquals("Tech", result.category().name());
        assertEquals(List.of("Code"), result.tags().stream().map(tag -> tag.name()).toList());
    }

    @Test
    void missingOrInactiveClubUsesSameNotFoundResult() {
        assertThrows(ClubNotFoundException.class, () -> service.getClubProfile("999"));
        assertThrows(ClubNotFoundException.class, () -> service.getClubProfile("8"));
        assertThrows(ClubNotFoundException.class, () -> service.getOpenRecruitmentRounds("8", 0, 20));
    }

    @Test
    void rejectsNonDecimalNonPositiveAndOverflowIdsBeforeQuerying() {
        int before = lookups.get();
        for (String id : List.of("abc", "-1", "0", "9223372036854775808", "12345678901234567890")) {
            assertThrows(InvalidPublicClubIdException.class, () -> service.getClubProfile(id));
        }
        assertEquals(before, lookups.get());
    }

    @Test
    void filtersRoundsUsingOneInstantAndReturnsEmptyCollectionWhenNoneMatch() {
        var result = service.getOpenRecruitmentRounds("7", 0, 20);
        assertEquals(List.<OpenPublicRecruitmentRoundDto>of(), result.items());
        assertEquals(0L, result.page().totalElements());
        assertEquals(0L, result.page().totalPages());
        assertEquals(1, clockReads.get());
        assertEquals(NOW, queries.countNow);
        assertEquals(NOW, queries.pageNow);
    }

    @Test
    void usesExpectedPaginationAndRejectsOutOfRangeParameters() {
        queries.total = 11L;
        var page = service.getOpenRecruitmentRounds("7", 2, 5);
        assertEquals(3L, page.page().totalPages());
        assertEquals(10L, queries.offset);
        assertThrows(ClubValidationException.class,
                () -> service.getOpenRecruitmentRounds("7", -1, 5));
        assertThrows(ClubValidationException.class,
                () -> service.getOpenRecruitmentRounds("7", 0, 101));
    }

    @Test
    void openCallsShareOneInstantAndPaginationRulesWithoutClubLookup() {
        queries.total = 11L;
        var page = service.getOpenCalls(2, 5);
        assertEquals(3L, page.page().totalPages());
        assertEquals(11L, page.page().totalElements());
        assertEquals(10L, queries.offset);
        assertEquals(1, clockReads.get());
        assertEquals(NOW, queries.pageNow);
        assertEquals(NOW, queries.countNow);
        assertEquals(0, lookups.get());

        int clockReadsBefore = clockReads.get();
        assertThrows(ClubValidationException.class, () -> service.getOpenCalls(-1, 5));
        assertThrows(ClubValidationException.class, () -> service.getOpenCalls(0, 0));
        assertThrows(ClubValidationException.class, () -> service.getOpenCalls(0, 101));
        assertEquals(clockReadsBefore, clockReads.get(), "Invalid paging is rejected before querying");
    }

    @Test
    void searchesThaiClubNameWithDefaultFilters() {
        queries.total = 1L;
        var result = service.searchPublicClubs("  ชมรมดนตรี  ", null, null, null, 0, 20, null);

        assertEquals("ชมรมดนตรี", queries.searchTerm);
        assertEquals(null, queries.searchCategoryId);
        assertEquals(null, queries.searchTagId);
        assertEquals("ALL", queries.searchStatus);
        assertEquals(false, queries.descending);
        assertEquals(0L, queries.offset);
        assertEquals(20, queries.searchSize);
        assertEquals(1L, result.page().totalElements());
        assertEquals(1L, result.page().totalPages());
        assertEquals(1, clockReads.get());
        assertEquals(NOW, queries.pageNow);
        assertEquals(NOW, queries.countNow);
    }

    @Test
    void combinesEnglishSearchFiltersAndPagination() {
        queries.total = 11L;
        var result = service.searchPublicClubs("  Coding  ", "3", "4", "OPEN", 2, 5, "name,desc");

        assertEquals("Coding", queries.searchTerm);
        assertEquals(3L, queries.searchCategoryId);
        assertEquals(4L, queries.searchTagId);
        assertEquals("OPEN", queries.searchStatus);
        assertEquals(true, queries.descending);
        assertEquals(10L, queries.offset);
        assertEquals(5, queries.searchSize);
        assertEquals(2, result.page().number());
        assertEquals(5, result.page().size());
        assertEquals(11L, result.page().totalElements());
        assertEquals(3L, result.page().totalPages());
        assertEquals(1, clockReads.get());
    }

    @Test
    void supportsClosedStatusAndBlankSearch() {
        service.searchPublicClubs("   ", null, null, "CLOSED", 0, 20, "name,asc");

        assertEquals(null, queries.searchTerm);
        assertEquals("CLOSED", queries.searchStatus);
        assertEquals(false, queries.descending);
    }

    @Test
    void rejectsInvalidSearchParametersBeforeQuerying() {
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, null, "ALL", -1, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, null, "ALL", 0, 101, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, "0", null, "ALL", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, "01", null, "ALL", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, "002", "ALL", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, "abc", "ALL", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, null, "INVALID", 0, 20, "name,asc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs(null, null, null, "ALL", 0, 20, "id,desc"));
        assertThrows(ClubValidationException.class,
                () -> service.searchPublicClubs("a".repeat(201), null, null, "ALL", 0, 20, "name,asc"));

        assertEquals(0, queries.searchCalls);
        assertEquals(0, queries.countCalls);
        assertEquals(0, clockReads.get());
    }

    private static void setId(Club club, Long id) throws Exception {
        Field field = Club.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(club, id);
    }

    private static final class FixtureQueries extends ClubProfileQueryRepository {
        private Instant pageNow;
        private Instant countNow;
        private long offset;
        private long total;
        private String searchTerm;
        private Long searchCategoryId;
        private Long searchTagId;
        private String searchStatus;
        private boolean descending;
        private int searchSize;
        private int searchCalls;
        private int countCalls;

        private FixtureQueries() {
            super(null);
        }

        @Override
        public ClubCategoryDto findCategory(Long categoryId) {
            return new ClubCategoryDto("3", "Tech");
        }

        @Override
        public List<ClubTagDto> findTags(Long clubId) {
            return List.of(new ClubTagDto("4", "Code"));
        }

        @Override
        public List<OpenPublicRecruitmentRoundDto> findOpenPublicRounds(
                Long clubId, Instant now, int size, long offset) {
            this.pageNow = now;
            this.offset = offset;
            return List.of();
        }

        @Override
        public List<PublicClubSearchItemDto> searchPublicClubs(
                String q, Long categoryId, Long tagId, String recruitmentStatus,
                Instant now, boolean descending, int size, long offset) {
            this.searchTerm = q;
            this.searchCategoryId = categoryId;
            this.searchTagId = tagId;
            this.searchStatus = recruitmentStatus;
            this.pageNow = now;
            this.descending = descending;
            this.searchSize = size;
            this.offset = offset;
            this.searchCalls++;
            return List.of();
        }

        @Override
        public long countPublicClubs(
                String q, Long categoryId, Long tagId, String recruitmentStatus, Instant now) {
            this.countNow = now;
            this.countCalls++;
            return total;
        }

        @Override
        public long countOpenPublicRounds(Long clubId, Instant now) {
            this.countNow = now;
            return total;
        }

        @Override
        public List<PublicOpenCallDto> findOpenCalls(Instant now, int size, long offset) {
            this.pageNow = now;
            this.offset = offset;
            return List.of();
        }

        @Override
        public long countOpenCalls(Instant now) {
            this.countNow = now;
            return total;
        }
    }
}