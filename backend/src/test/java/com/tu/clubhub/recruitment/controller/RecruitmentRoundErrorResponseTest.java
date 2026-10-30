package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.service.RecruitmentRoundService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RecruitmentRoundErrorResponseTest {

    private static final String PATH =
            "/api/v1/clubs/1/rounds/10";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecruitmentRoundService service;

    @MockitoBean
    private ClubSecurity clubSecurity;

    private UsernamePasswordAuthenticationToken login() {
        var principal =
                new ClubHubPrincipal(100L, "test-committee", "USER");

        return UsernamePasswordAuthenticationToken.authenticated(
                principal, null, List.of());
    }

    @Test
    void malformedJsonReturnsStandardProblem() throws Exception {
        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().string(
                        "Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.type")
                        .value("urn:tuclubhub:problem:validation-error"))
                .andExpect(jsonPath("$.instance").value(PATH))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors[0].field")
                        .value("request"));

        verifyNoInteractions(service);
    }

    @Test
    void missingActionIdentifiesInvalidField() throws Exception {
        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath(
                        "$.fieldErrors[?(@.field == 'action')]")
                        .isNotEmpty());

        verifyNoInteractions(service);
    }

    @Test
    void missingRoundReturnsStandard404() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        when(service.publishRound(1L, 10L, 0L))
                .thenThrow(
                        new org.springframework.web.server.ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Recruitment round not found in this club"));

        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.type")
                        .value("urn:tuclubhub:problem:resource-not-found"))
                .andExpect(jsonPath("$.instance").value(PATH))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void staleVersionReturnsStandard409() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        when(service.closeRound(1L, 10L, 0L))
                .thenThrow(
                        new org.springframework.web.server.ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Round was modified; reload before retrying"));

        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"CLOSE"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.detail").value(
                        "Round was modified; reload before retrying"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void nonPositiveIdsReturnInvalidResourceId() throws Exception {
        for (String path : List.of(
                "/api/v1/clubs/0/rounds/10",
                "/api/v1/clubs/1/rounds/0")) {

            mockMvc.perform(patch(path)
                            .with(authentication(login()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"version":0,"action":"PUBLISH"}
                                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(
                            MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.code")
                            .value("INVALID_RESOURCE_ID"))
                    .andExpect(jsonPath("$.type").value(
                            "urn:tuclubhub:problem:invalid-resource-id"))
                    .andExpect(jsonPath("$.instance").value(path))
                    .andExpect(jsonPath("$.fieldErrors[0].field")
                            .isNotEmpty());
        }

        verifyNoInteractions(service);
    }

    @Test
    void nonNumericIdReturnsInvalidResourceId() throws Exception {
        mockMvc.perform(patch("/api/v1/clubs/abc/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"))
                .andExpect(jsonPath("$.fieldErrors[0].field")
                        .value("clubId"));

        verifyNoInteractions(service);
    }

    @Test
    void databaseFailureReturnsStandard503() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        when(service.publishRound(1L, 10L, 0L))
                .thenThrow(new DataAccessResourceFailureException(
                        "jdbc:postgresql://internal-host/db"));

        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.detail").value(
                        "The database is temporarily unavailable."))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void unexpectedFailureDoesNotExposeInternalDetails() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        when(service.publishRound(1L, 10L, 0L))
                .thenThrow(new IllegalStateException(
                        "Internal database information"));

        mockMvc.perform(patch(PATH)
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail")
                        .value("The request could not be completed."))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }
}