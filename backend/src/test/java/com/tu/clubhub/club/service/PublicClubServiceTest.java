package com.tu.clubhub.club.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import com.tu.clubhub.club.service.PublicClubService.InvalidPublicClubIdException;

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
                    if (method.getName().equals("toString")) return "ClubRepository test proxy";
                    throw new UnsupportedOperationException(method.getName());
                });
        queries = new FixtureQueries();
        Clock clock = new Clock() {
            @Override public ZoneId getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { clockReads.incrementAndGet(); return NOW; }
        };
        service = new PublicClubService(clubs, queries, clock);
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

        private FixtureQueries() { super(null); }

        @Override public ClubCategoryDto findCategory(Long categoryId) {
            return new ClubCategoryDto("3", "Tech");
        }

        @Override public List<ClubTagDto> findTags(Long clubId) {
            return List.of(new ClubTagDto("4", "Code"));
        }

        @Override public List<OpenPublicRecruitmentRoundDto> findOpenPublicRounds(
                Long clubId, Instant now, int size, long offset) {
            this.pageNow = now;
            this.offset = offset;
            return List.of();
        }

        @Override public long countOpenPublicRounds(Long clubId, Instant now) {
            this.countNow = now;
            return total;
        }
    }
}
