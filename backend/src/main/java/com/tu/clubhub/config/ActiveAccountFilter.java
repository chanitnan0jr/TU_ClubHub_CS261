package com.tu.clubhub.config;

import java.io.IOException;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.user.repository.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Rechecks the session account against current database state. A suspended
 * account loses its session; protected API requests are rejected with
 * ACCOUNT_NOT_ALLOWED while public requests continue anonymously.
 */
public final class ActiveAccountFilter extends OncePerRequestFilter {

	private final UserAccountRepository userAccountRepository;
	private final ObjectMapper objectMapper;

	public ActiveAccountFilter(UserAccountRepository userAccountRepository, ObjectMapper objectMapper) {
		this.userAccountRepository = userAccountRepository;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null
				&& authentication.getPrincipal() instanceof ClubHubPrincipal principal
				&& principal.userId() != null
				&& !isSessionCleanup(request)
				&& isSuspended(principal.userId())) {
			HttpSession session = request.getSession(false);
			if (session != null) {
				session.invalidate();
			}
			SecurityContextHolder.clearContext();
			if (isProtectedApiRequest(request)) {
				SecurityConfiguration.writeProblem(objectMapper, response, request.getRequestURI(), 403,
						"Account not allowed", "This account is not allowed to use TU-ClubHub.",
						"ACCOUNT_NOT_ALLOWED");
				return;
			}
		}
		filterChain.doFilter(request, response);
	}

	// Committee checks already deny an account row that does not exist; only a
	// stored non-ACTIVE status is reported as a suspended account.
	private boolean isSuspended(Long userId) {
		return userAccountRepository.findAccountStatusById(userId)
				.map(status -> !"ACTIVE".equals(status))
				.orElse(false);
	}

	// Login verifies the account itself, and logout must always be able to end a session.
	private static boolean isSessionCleanup(HttpServletRequest request) {
		String path = request.getRequestURI();
		return "/api/v1/auth/login".equals(path) || "/api/v1/auth/logout".equals(path);
	}

	private static boolean isProtectedApiRequest(HttpServletRequest request) {
		return request.getRequestURI().startsWith("/api/")
				&& !PublicRoutes.MATCHER.matches(request);
	}
}
