package com.tu.clubhub.club.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import com.tu.clubhub.club.dto.OpenPublicRecruitmentRoundDto;
import com.tu.clubhub.club.dto.PublicClubCategoryDto;
import com.tu.clubhub.club.dto.PublicClubProfileDto;
import com.tu.clubhub.club.dto.PublicClubTagDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import com.tu.clubhub.club.dto.PublicRecruitmentRoundPageDto;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.PublicClubService;
import com.tu.clubhub.club.service.PublicClubService.InvalidPublicClubIdException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PublicClubControllerIntegrationTest.FakePublicClubServiceConfiguration.class)
class PublicClubControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousCanReadActiveClubAndOnlyPublicFieldsAreSerialized() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys()", containsInAnyOrder(
                        "id", "name", "description", "objectives", "contactUrl",
                        "facebookUrl", "instagramUrl", "contactEmail", "affiliationLevel",
                        "affiliationName", "imageUrl", "bannerUrl", "category", "tags")))
                .andExpect(jsonPath("$.id").value("7"))
                .andExpect(jsonPath("$.name").value("Coding"))
                .andExpect(jsonPath("$.category.id").value("3"))
                .andExpect(jsonPath("$.category.name").value("Technology"))
                .andExpect(jsonPath("$.tags[0].name").value("Programming"))
                .andExpect(jsonPath("$.category.keys()", containsInAnyOrder("id", "name")))
                .andExpect(jsonPath("$.tags[0].keys()", containsInAnyOrder("id", "name")));
    }

    @Test
    void anonymousCanReadRoundsAndEmptyRoundsUseContractWrapper() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs/7/recruitment-rounds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys()", containsInAnyOrder("items", "page")))
                .andExpect(jsonPath("$.items[0].keys()",
                        containsInAnyOrder("id", "name", "opensAt", "closesAt")))
                .andExpect(jsonPath("$.items[0].id").value("51"))
                .andExpect(jsonPath("$.items[0].name").value("Recruitment 2026"))
                .andExpect(jsonPath("$.items[0].opensAt").value("2026-10-01T00:00:00Z"))
                .andExpect(jsonPath("$.items[0].closesAt").value("2026-10-31T00:00:00Z"))
                .andExpect(jsonPath("$.page.keys()",
                        containsInAnyOrder("number", "size", "totalElements", "totalPages")));

        mockMvc.perform(get("/api/v1/public/clubs/9/recruitment-rounds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(0))
                .andExpect(jsonPath("$.page.totalPages").value(0));
    }

    @Test
    void missingAndInactiveClubsUseContractNotFoundError() throws Exception {
        for (String id : List.of("404", "8")) {
            mockMvc.perform(get("/api/v1/public/clubs/{id}", id))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("CLUB_NOT_FOUND"));
            mockMvc.perform(get("/api/v1/public/clubs/{id}/recruitment-rounds", id))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("CLUB_NOT_FOUND"));
        }
    }

    @Test
    void malformedIdReturnsContractErrorNotServerError() throws Exception {
        mockMvc.perform(get("/api/v1/public/clubs/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));
    }

    @Test
    void publicGetPermissionDoesNotMakeOtherMethodsOrProtectedEndpointsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/public/clubs/7")
                        .with(user("anonymous-test-user"))
                        .with(csrf()))
                .andExpect(status().isMethodNotAllowed());
    }

    @TestConfiguration
    static class FakePublicClubServiceConfiguration {
        @Bean
        @Primary
        PublicClubService fakePublicClubService() {
            return new FakePublicClubService();
        }
    }

    public static class FakePublicClubService extends PublicClubService {
        public FakePublicClubService() {
            super(null, null, null);
        }

        @Override
        public PublicClubProfileDto getClubProfile(String id) {
            validateId(id);
            if ("8".equals(id) || "404".equals(id)) {
                throw new ClubNotFoundException();
            }
            return profile(id);
        }

        @Override
        public PublicRecruitmentRoundPageDto getOpenRecruitmentRounds(String id, int page, int size) {
            validateId(id);
            if ("8".equals(id) || "404".equals(id)) {
                throw new ClubNotFoundException();
            }
            List<OpenPublicRecruitmentRoundDto> rounds = "9".equals(id)
                    ? List.of()
                    : List.of(new OpenPublicRecruitmentRoundDto(
                            "51", "Recruitment 2026",
                            Instant.parse("2026-10-01T00:00:00Z"),
                            Instant.parse("2026-10-31T00:00:00Z")));
            return new PublicRecruitmentRoundPageDto(
                    rounds,
                    new PublicPageMetadataDto(page, size, rounds.size(), rounds.isEmpty() ? 0 : 1));
        }

        private static void validateId(String id) {
            if (!id.matches("[0-9]{1,19}") || "0".equals(id)) {
                throw new InvalidPublicClubIdException();
            }
        }

        private static PublicClubProfileDto profile(String id) {
            return new PublicClubProfileDto(
                    id, "Coding", "Public description", "Learn together",
                    null, null, null, null, null, null, null, null,
                    new PublicClubCategoryDto("3", "Technology"),
                    List.of(new PublicClubTagDto("4", "Programming")));
        }
    }
}
