
package com.tu.clubhub.club.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.tu.clubhub.club.dto.PublicClubSearchPageDto;
import com.tu.clubhub.club.dto.PublicPageMetadataDto;
import com.tu.clubhub.club.service.PublicClubService;

class PublicClubSearchControllerTest {

    private MockMvc mockMvc;
    private PublicClubService service;

    @BeforeEach
    void setUp() {
        service = mock(PublicClubService.class);

        mockMvc = MockMvcBuilders
                .standaloneSetup(
                        new PublicClubController(service))
                .build();
    }

    @Test
    void searchesClubsWithDefaultParameters() throws Exception {
        var response = new PublicClubSearchPageDto(
                List.of(),
                new PublicPageMetadataDto(0, 20, 0, 0)
        );

        when(service.searchPublicClubs(
                null, null, null, "ALL", 0, 20, "name,asc"))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/public/clubs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20));

        verify(service).searchPublicClubs(
                null, null, null, "ALL", 0, 20, "name,asc");
    }

    @Test
    void forwardsSearchFiltersToService() throws Exception {
        var response = new PublicClubSearchPageDto(
                List.of(),
                new PublicPageMetadataDto(1, 5, 0, 0)
        );

        when(service.searchPublicClubs(
                "Coding", "30001", "40001",
                "OPEN", 1, 5, "name,desc"))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/public/clubs")
                        .param("q", "Coding")
                        .param("categoryId", "30001")
                        .param("tagId", "40001")
                        .param("recruitmentStatus", "OPEN")
                        .param("page", "1")
                        .param("size", "5")
                        .param("sort", "name,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.number").value(1))
                .andExpect(jsonPath("$.page.size").value(5));

        verify(service).searchPublicClubs(
                "Coding", "30001", "40001",
                "OPEN", 1, 5, "name,desc");
    }
}
