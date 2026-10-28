package com.tu.clubhub.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(RouteSecurityIntegrationTest.ProbeController.class)
class RouteSecurityIntegrationTest {

    private static final String PUBLIC_PATH =
            "/api/v1/public/clubs/route-security-probe";

    private static final String PRIVATE_PATH =
            "/api/v1/route-security-probe";

    @Autowired
    private MockMvc mvc;

    @Test
    void publicGetWorksWithoutLogin() throws Exception {
        mvc.perform(get(PUBLIC_PATH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("public"));
    }

    @Test
    void privateGetRequiresLogin() throws Exception {
        mvc.perform(get(PRIVATE_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(
                        "application/problem+json"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void privateGetWorksWithAuthenticatedUser() throws Exception {
        mvc.perform(get(PRIVATE_PATH)
                        .with(user("route-test-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("private"));
    }

    @Test
    void postToPublicGetPathStillRequiresLogin() throws Exception {
        // Supply CSRF so this checks authentication, not a missing token.
        mvc.perform(post(PUBLIC_PATH)
                        .with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void authenticatedPostWithoutCsrfIsRejected() throws Exception {
        mvc.perform(post(PRIVATE_PATH)
                        .with(user("route-test-user")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    void authenticatedPostWithCsrfWorks() throws Exception {
        mvc.perform(post(PRIVATE_PATH)
                        .with(user("route-test-user"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("private"));
    }

    @Test
    void undeclaredApiRouteRequiresLogin() throws Exception {
        mvc.perform(get("/api/v1/not-in-whitelist"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void healthRemainsPublic() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    /**
     * Test-only endpoints isolate route security from business logic.
     * These endpoints are not included in the production application.
     */
    @RestController
    static class ProbeController {

        @GetMapping(PUBLIC_PATH)
        Map<String, String> publicGet() {
            return Map.of("result", "public");
        }

        @PostMapping(PUBLIC_PATH)
        Map<String, String> publicPost() {
            return Map.of("result", "public-write");
        }

        @GetMapping(PRIVATE_PATH)
        Map<String, String> privateGet() {
            return Map.of("result", "private");
        }

        @PostMapping(PRIVATE_PATH)
        Map<String, String> privatePost() {
            return Map.of("result", "private");
        }
    }
}
