package com.tu.clubhub.config;

import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * The only requests served without a session, by method and path. Session filters still clear
 * an expired or suspended session on these; they only let the request continue anonymously.
 * Any route not listed requires authentication.
 */
final class PublicRoutes {

	static final RequestMatcher MATCHER = new OrRequestMatcher(
			// Built frontend assets.
			get("/"), get("/index.html"), get("/favicon.ico"), get("/assets/**"),
			get("/*.svg"), get("/*.png"), get("/*.ico"), get("/*.json"),
			// SPA routes forwarded to index.html by SpaForwardController.
			get("/login"), get("/clubs/**"), get("/profile"), get("/dashboard/**"),
			// Public API.
			get("/api/v1/auth/csrf"), post("/api/v1/auth/login"),
			get("/api/v1/public/clubs/*"), get("/api/v1/public/clubs/*/recruitment-rounds"),
			get("/actuator/health"));

	private PublicRoutes() {
	}

	private static RequestMatcher get(String pattern) {
		return PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, pattern);
	}

	private static RequestMatcher post(String pattern) {
		return PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, pattern);
	}
}
