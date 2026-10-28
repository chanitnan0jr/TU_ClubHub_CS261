package com.tu.clubhub.config;

import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * Central whitelist shared by the security chain and session filters.
 * Each public route is restricted by HTTP method and path.
 * Requests not listed here require authentication.
 */
final class PublicRoutes {

    static final RequestMatcher MATCHER = new OrRequestMatcher(
            // Built frontend assets.
            get("/"),
            get("/index.html"),
            get("/favicon.ico"),
            get("/assets/**"),
            get("/*.svg"),
            get("/*.png"),
            get("/*.ico"),
            get("/*.json"),

            // Existing SPA routes.
            get("/login"),
            get("/clubs/**"),
            get("/profile"),
            get("/dashboard/**"),

            // Authentication bootstrap.
            get("/api/v1/auth/csrf"),
            post("/api/v1/auth/login"),

            // Public club APIs defined by Task75.
            get("/api/v1/public/clubs"),
            get("/api/v1/public/club-categories"),
            get("/api/v1/public/interest-tags"),
            get("/api/v1/public/clubs/*"),
            get("/api/v1/public/clubs/*/recruitment-rounds"),

            // Deployment health check.
            get("/actuator/health")
    );

    private PublicRoutes() {
    }

    private static RequestMatcher get(String pattern) {
        return PathPatternRequestMatcher.withDefaults()
                .matcher(HttpMethod.GET, pattern);
    }

    private static RequestMatcher post(String pattern) {
        return PathPatternRequestMatcher.withDefaults()
                .matcher(HttpMethod.POST, pattern);
    }
}