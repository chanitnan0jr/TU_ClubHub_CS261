package com.tu.clubhub.config;

import java.io.IOException;
import java.time.Duration;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

public final class AbsoluteSessionTimeoutFilter extends OncePerRequestFilter {

	public static final String LOGIN_AT_ATTRIBUTE = "tuClubHub.authenticatedAtEpochMilli";
	static final Duration ABSOLUTE_TIMEOUT = Duration.ofHours(8);
	private final ObjectMapper objectMapper;

	public AbsoluteSessionTimeoutFilter(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		HttpSession session = request.getSession(false);
		if (session != null) {
			Object authenticatedAt = session.getAttribute(LOGIN_AT_ATTRIBUTE);
			if (authenticatedAt instanceof Long loginTime
					&& System.currentTimeMillis() - loginTime >= ABSOLUTE_TIMEOUT.toMillis()) {
				session.invalidate();
				SecurityContextHolder.clearContext();
				if (!isPublicRequest(request)) {
					SecurityConfiguration.writeProblem(objectMapper, response, request.getRequestURI(), 401,
							"Authentication required", "Your session has expired. Sign in again.",
							"AUTHENTICATION_REQUIRED");
					return;
				}
			}
		}
		filterChain.doFilter(request, response);
	}

	private static boolean isPublicRequest(HttpServletRequest request) {
		if (!"GET".equals(request.getMethod())) {
			return false;
		}
		String path = request.getRequestURI();
		return "/api/v1/auth/csrf".equals(path) || path.startsWith("/api/v1/clubs/");
	}
}
