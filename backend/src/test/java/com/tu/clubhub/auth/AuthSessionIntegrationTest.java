package com.tu.clubhub.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.auth.dto.LoginResponse;
import com.tu.clubhub.user.repository.UserAccountRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthSessionIntegrationTest {

	private static final String SESSION_COOKIE = "SESSION";
	private static final String DEMO_USERNAME = "student-demo";
	private static final String LOGIN_BODY = """
			{"username":"student-demo","password":"tu-clubhub-demo"}
			""";
	private static final String INVALID_LOGIN_BODY = """
			{"username":"student-demo","password":"wrong-password"}
			""";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private UserAccountRepository userAccountRepository;

	@BeforeEach
	void clearUsers() {
		userAccountRepository.deleteAll();
	}

	@Test
	void loginRotatesSessionAndReturnsFreshCsrfThatWorksForMeAndLogout() throws Exception {
		CsrfSession anonymous = getCsrfSession();

		MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
				.cookie(anonymous.cookie())
				.header(anonymous.csrf().headerName(), anonymous.csrf().token())
				.contentType(MediaType.APPLICATION_JSON)
				.content(LOGIN_BODY))
			.andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
			.andReturn();

		LoginResponse login = objectMapper.readValue(loginResult.getResponse().getContentAsString(), LoginResponse.class);
		Cookie authenticatedCookie = cookie(loginResult.getResponse());
		assertNotEquals(anonymous.cookie().getValue(), authenticatedCookie.getValue(), "login rotates the session ID");
		assertNotEquals(anonymous.csrf().token(), login.csrf().token(), "login returns a fresh CSRF token");
		assertEquals("USER", login.user().role());
		assertEquals(1, userAccountRepository.count(), "first verified login provisions one local account");
		assertTrue(userAccountRepository.findByTuUsername(DEMO_USERNAME).isPresent());

		mockMvc.perform(get("/api/v1/auth/me").cookie(authenticatedCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.id").isNotEmpty())
				.andExpect(jsonPath("$.user.role").value("USER"));

		mockMvc.perform(post("/api/v1/auth/logout")
				.cookie(authenticatedCookie)
				.header(login.csrf().headerName(), login.csrf().token()))
			.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/auth/me").cookie(authenticatedCookie))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
	}

	@Test
	void loginRejectsMissingOrInvalidCsrfToken() throws Exception {
		CsrfSession anonymous = getCsrfSession();

		mockMvc.perform(post("/api/v1/auth/login")
				.cookie(anonymous.cookie())
				.header(anonymous.csrf().headerName(), "incorrect-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content(LOGIN_BODY))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("CSRF_INVALID"));
	}

	@Test
	void invalidCredentialsDoNotProvisionAnAccountOrSession() throws Exception {
		CsrfSession anonymous = getCsrfSession();

		mockMvc.perform(post("/api/v1/auth/login")
				.cookie(anonymous.cookie())
				.header(anonymous.csrf().headerName(), anonymous.csrf().token())
				.contentType(MediaType.APPLICATION_JSON)
				.content(INVALID_LOGIN_BODY))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));

		assertEquals(0, userAccountRepository.count());
		mockMvc.perform(get("/api/v1/auth/me").cookie(anonymous.cookie()))
				.andExpect(status().isUnauthorized());
	}

	private CsrfSession getCsrfSession() throws Exception {
		MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf"))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
				.andReturn();
		CsrfTokenResponse csrf = objectMapper.readValue(result.getResponse().getContentAsString(), CsrfTokenResponse.class);
		return new CsrfSession(cookie(result.getResponse()), csrf);
	}

	private static Cookie cookie(MockHttpServletResponse response) {
		Cookie cookie = Arrays.stream(response.getCookies())
				.filter(candidate -> SESSION_COOKIE.equals(candidate.getName()))
				.findFirst()
				.orElse(null);
		assertNotNull(cookie, "Spring Session should set its HTTP-only session cookie");
		return cookie;
	}

	private record CsrfSession(Cookie cookie, CsrfTokenResponse csrf) {
	}
}
