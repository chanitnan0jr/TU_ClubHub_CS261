package com.tu.clubhub.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class PublicRoutesTest {

    @Test
    void publicClubGetRoutesAreAllowed() {
        for (String path : new String[]{
                "/api/v1/public/clubs",
                "/api/v1/public/club-categories",
                "/api/v1/public/interest-tags",
                "/api/v1/public/clubs/123",
                "/api/v1/public/clubs/123/recruitment-rounds"
        }) {
            assertTrue(matches("GET", path), path);
        }
    }

    @Test
    void publicClubRoutesDoNotAllowWriteMethods() {
        for (String method : new String[]{
                "POST", "PUT", "PATCH", "DELETE"
        }) {
            for (String path : new String[]{
                    "/api/v1/public/clubs",
                    "/api/v1/public/club-categories",
                    "/api/v1/public/interest-tags",
                    "/api/v1/public/clubs/123",
                    "/api/v1/public/clubs/123/recruitment-rounds"
            }) {
                assertFalse(
                        matches(method, path),
                        method + " " + path);
            }
        }
    }

    @Test
    void privateAndUndeclaredApiRoutesAreNotPublic() {
        for (String path : new String[]{
                "/api/v1/auth/me",
                "/api/v1/auth/logout",
                "/api/v1/clubs",
                "/api/v1/clubs/123",
                "/api/v1/clubs/123/rounds",
                "/api/v1/rounds/123/questions",
                "/api/v1/me/applications",
                "/api/v1/admin/dashboard/stats",
                "/api/v1/public/clubs/123/applications",
                "/api/v1/public/unknown",
                "/api/v1/new-endpoint"
        }) {
            assertFalse(matches("GET", path), path);
        }
    }

    @Test
    void authenticationBootstrapIsRestrictedByMethod() {
        assertTrue(matches("GET", "/api/v1/auth/csrf"));
        assertTrue(matches("POST", "/api/v1/auth/login"));

        assertFalse(matches("POST", "/api/v1/auth/csrf"));
        assertFalse(matches("GET", "/api/v1/auth/login"));
        assertFalse(matches("PUT", "/api/v1/auth/login"));
        assertFalse(matches("POST", "/api/v1/auth/logout"));
    }

    @Test
    void onlyExactHealthGetRouteIsPublic() {
        assertTrue(matches("GET", "/actuator/health"));

        assertFalse(matches("POST", "/actuator/health"));
        assertFalse(matches("GET", "/actuator/health/details"));
        assertFalse(matches("GET", "/actuator/env"));
        assertFalse(matches("GET", "/actuator/metrics"));
    }

    private boolean matches(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);

        return PublicRoutes.MATCHER.matches(request);
    }
}