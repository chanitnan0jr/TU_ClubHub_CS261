package com.tu.clubhub.club.controller;

import java.util.List;
import java.util.Map;

import com.tu.clubhub.club.dto.ClubResponseDto;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.service.ClubService;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import com.tu.clubhub.committee.security.ClubSecurity;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClubControllerTest {

    private static final String BODY = """
            {
              "name": "Music Club",
              "description": "A club for music lovers"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClubService clubService;

    @MockitoBean(name = "clubSecurity")
    private ClubSecurity clubSecurity;

    @Test
    void authorizedUserCanUpdateClub() throws Exception {
        when(clubSecurity.isCommittee(41L)).thenReturn(true);

        ClubResponseDto response = new ClubResponseDto(
                "41",
                "1",
                "Music Club",
                "A club for music lovers",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "ACTIVE",
                new ClubResponseDto.ClubCategoryDto("1", "Music"),
                List.of(),
                List.of()
        );

        when(clubService.updateClub(
                eq(41L),
                any(ClubUpdateRequestDto.class)
        )).thenReturn(response);

        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(user("committee"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_JSON
                ))
                .andExpect(jsonPath("$.id").value("41"))
                .andExpect(jsonPath("$.name").value("Music Club"))
                .andExpect(jsonPath("$.category.name").value("Music"))
                .andExpect(jsonPath("$.tags").isArray())
                .andExpect(jsonPath("$.recruitmentRounds").isArray());

        verify(clubSecurity).isCommittee(41L);
        verify(clubService).updateClub(
                eq(41L),
                any(ClubUpdateRequestDto.class)
        );
    }

    @Test
    void unauthenticatedUserGets401() throws Exception {
        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));

        verifyNoInteractions(clubService);
    }

    @Test
    void userWithoutPermissionGets403() throws Exception {
        when(clubSecurity.isCommittee(41L)).thenReturn(false);

        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(user("student"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        verifyNoInteractions(clubService);
    }

    @Test
    void missingCsrfGets403() throws Exception {
        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(user("committee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        verifyNoInteractions(clubService);
    }

    @Test
    void invalidDataGets400() throws Exception {
        when(clubSecurity.isCommittee(41L)).thenReturn(true);

        when(clubService.updateClub(
                eq(41L),
                any(ClubUpdateRequestDto.class)
        )).thenThrow(new ClubValidationException(
                Map.of("contactEmail", "Invalid email format")
        ));

        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(user("committee"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Music Club",
                                  "description": "Music",
                                  "contactEmail": "club@"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON
                ))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors[0].field")
                        .value("contactEmail"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void missingClubGets404() throws Exception {
        when(clubSecurity.isCommittee(41L)).thenReturn(true);

        when(clubService.updateClub(
                eq(41L),
                any(ClubUpdateRequestDto.class)
        )).thenThrow(new ClubNotFoundException());

        mockMvc.perform(put("/api/v1/clubs/41")
                        .with(user("committee"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CLUB_NOT_FOUND"));
    }

    @Test
    void nonNumericIdGets400() throws Exception {
        mockMvc.perform(put("/api/v1/clubs/abc")
                        .with(user("committee"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));

        verifyNoInteractions(clubService, clubSecurity);
    }

    @Test
    void negativeIdGets400() throws Exception {
        mockMvc.perform(put("/api/v1/clubs/-1")
                        .with(user("committee"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));

        verifyNoInteractions(clubService, clubSecurity);
    }
}