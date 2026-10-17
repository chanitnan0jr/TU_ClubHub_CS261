package com.tu.clubhub.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.json.JsonMapper;

class AbsoluteSessionTimeoutFilterTest {

	@Test
	void invalidatesAuthenticatedSessionsAfterEightHours() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE,
				System.currentTimeMillis() - Duration.ofHours(8).toMillis() - 1);
		request.setSession(session);
		SecurityContextHolder.getContext().setAuthentication(
				UsernamePasswordAuthenticationToken.authenticated("test-user", null, java.util.List.of()));
		AtomicBoolean continued = new AtomicBoolean();

		new AbsoluteSessionTimeoutFilter(JsonMapper.builder().build()).doFilter(request, response,
				(servletRequest, servletResponse) -> continued.set(true));

		assertTrue(!continued.get(), "protected request stops after absolute expiry");
		assertEquals(401, response.getStatus());
		assertNull(request.getSession(false), "expired session is invalidated");
		assertNull(SecurityContextHolder.getContext().getAuthentication(), "expired authentication is cleared");
		SecurityContextHolder.clearContext();
	}

	@Test
	void invalidatesExpiredSessionButAllowsFreshCsrfBootstrap() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setMethod("GET");
		request.setRequestURI("/api/v1/auth/csrf");
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE,
				System.currentTimeMillis() - Duration.ofHours(9).toMillis());
		request.setSession(session);
		AtomicBoolean continued = new AtomicBoolean();

		new AbsoluteSessionTimeoutFilter(JsonMapper.builder().build()).doFilter(request, response,
				(servletRequest, servletResponse) -> continued.set(true));

		assertTrue(continued.get(), "expired login may bootstrap a new CSRF session");
		assertNull(request.getSession(false), "expired session is invalidated before a new one is created");
	}

	@Test
	void allowsNonExpiredAuthenticatedSession() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE,
				System.currentTimeMillis() - Duration.ofMinutes(15).toMillis());
		request.setSession(session);
		SecurityContextHolder.getContext().setAuthentication(
				UsernamePasswordAuthenticationToken.authenticated("test-user", null, java.util.List.of()));
		AtomicBoolean continued = new AtomicBoolean();

		new AbsoluteSessionTimeoutFilter(JsonMapper.builder().build()).doFilter(request, response,
				(servletRequest, servletResponse) -> continued.set(true));

		assertTrue(continued.get(), "active session continues through filter chain");
		assertEquals(200, response.getStatus());
		assertEquals(session, request.getSession(false), "active session is preserved");
		SecurityContextHolder.clearContext();
	}

	@Test
	void ignoresUnauthenticatedSessionWithoutLoginAttribute() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockHttpSession session = new MockHttpSession();
		request.setSession(session);
		AtomicBoolean continued = new AtomicBoolean();

		new AbsoluteSessionTimeoutFilter(JsonMapper.builder().build()).doFilter(request, response,
				(servletRequest, servletResponse) -> continued.set(true));

		assertTrue(continued.get(), "anonymous session continues through filter chain");
		assertEquals(session, request.getSession(false));
	}
}
