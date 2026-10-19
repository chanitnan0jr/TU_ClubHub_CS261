package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.service.RecruitmentRoundService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RecruitmentRoundControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecruitmentRoundService service;

    @MockitoBean
    private ClubSecurity clubSecurity;

    private UsernamePasswordAuthenticationToken login() {
        var principal = new ClubHubPrincipal(
                100L, "test-committee", "USER");

        return UsernamePasswordAuthenticationToken.authenticated(
                principal, null, List.of());
    }

    @Test
    void anonymousUserCannotPublish() throws Exception {
        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void requestWithoutCsrfIsRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void nonCommitteeCannotPublish() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(false);

        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void nonCommitteeCannotClose() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(false);

        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"CLOSE"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void nonCommitteeCannotCreate() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(false);

        mockMvc.perform(post("/api/v1/clubs/1/rounds")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Test round","academicYear":2569,"semester":1,
                                 "description":"Test","opensAt":"2026-10-19T08:00:00Z",
                                 "closesAt":"2026-10-20T08:00:00Z",
                                 "confirmationDeadline":"2026-10-21T08:00:00Z",
                                 "questions":[]}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void nonCommitteeCannotUpdate() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(false);

        mockMvc.perform(put("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Test round","academicYear":2569,"semester":1,
                                 "description":"Test","opensAt":"2026-10-19T08:00:00Z",
                                 "closesAt":"2026-10-20T08:00:00Z",
                                 "confirmationDeadline":"2026-10-21T08:00:00Z",
                                 "questions":[],"version":0}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void publishCallsService() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"action":"PUBLISH"}
                                """))
                .andExpect(status().isOk());

        verify(service).publishRound(1L, 10L, 0L);
    }

    @Test
    void closeCallsService() throws Exception {
        when(clubSecurity.isCommittee(1L)).thenReturn(true);

        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":1,"action":"CLOSE"}
                                """))
                .andExpect(status().isOk());

        verify(service).closeRound(1L, 10L, 1L);
    }

    @Test
    void missingActionIsRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void negativeVersionIsRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":-1,"action":"CLOSE"}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void emptyCreateBodyIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/clubs/1/rounds")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void emptyUpdateBodyIsRejected() throws Exception {
        mockMvc.perform(put("/api/v1/clubs/1/rounds/10")
                        .with(authentication(login()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }
}