package com.tu.clubhub.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
		"clubhub.auth.login-limit.attempts-per-client=3",
		"clubhub.auth.login-limit.attempts-per-username=2"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginRateLimitIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void aLockedUsernameIsRefusedEvenWithTheRightPasswordAndGetsNoSession() throws Exception {
		login("198.51.100.10", "student-demo", "wrong-password").andExpect(status().isUnauthorized());
		login("198.51.100.11", "student-demo", "wrong-password").andExpect(status().isUnauthorized());

		MvcResult result = login("198.51.100.12", "student-demo", "tu-clubhub-demo")
				.andExpect(status().isTooManyRequests())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(header().string("Retry-After", org.hamcrest.Matchers.matchesPattern("[1-9][0-9]*")))
				.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
				.andExpect(jsonPath("$.status").value(429))
				.andExpect(jsonPath("$.code").value("RATE_LIMITED"))
				.andReturn();

		Cookie session = result.getRequest().getCookies()[0];
		mockMvc.perform(get("/api/v1/auth/me").cookie(session)).andExpect(status().isUnauthorized());
	}

	@Test
	void aClientIsRefusedAfterTryingTooManyUsernames() throws Exception {
		for (int i = 1; i <= 3; i++) {
			login("198.51.100.20", "spray-" + i, "wrong-password").andExpect(status().isUnauthorized());
		}
		login("198.51.100.20", "spray-4", "wrong-password")
				.andExpect(status().isTooManyRequests())
				.andExpect(jsonPath("$.code").value("RATE_LIMITED"));
		login("198.51.100.21", "spray-4", "wrong-password").andExpect(status().isUnauthorized());
	}

	@Test
	void invalidRequestsDoNotUseUpAttempts() throws Exception {
		for (int i = 0; i < 4; i++) {
			login("198.51.100.30", "student-demo-2", "").andExpect(status().isBadRequest());
		}
		login("198.51.100.30", "spray-30", "wrong-password").andExpect(status().isUnauthorized());
	}

	private ResultActions login(String clientAddress, String username, String password) throws Exception {
		MvcResult csrf = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
		CsrfTokenResponse token = objectMapper.readValue(csrf.getResponse().getContentAsString(), CsrfTokenResponse.class);
		Cookie session = Arrays.stream(csrf.getResponse().getCookies())
				.filter(cookie -> "SESSION".equals(cookie.getName()))
				.findFirst()
				.orElseThrow();
		String body = objectMapper.writeValueAsString(java.util.Map.of("username", username, "password", password));
		return mockMvc.perform(post("/api/v1/auth/login")
				.with(request -> {
					request.setRemoteAddr(clientAddress);
					return request;
				})
				.cookie(session)
				.header(token.headerName(), token.token())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body));
	}
}
