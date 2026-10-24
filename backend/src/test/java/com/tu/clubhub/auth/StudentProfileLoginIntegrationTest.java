package com.tu.clubhub.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Optional;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.auth.integration.tu.TuAuthClient;
import com.tu.clubhub.auth.integration.tu.TuAuthUser;
import com.tu.clubhub.user.domain.StudentProfile;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.StudentProfileRepository;
import com.tu.clubhub.user.repository.UserAccountRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

/** Login creates or refreshes student_profiles from the TU identity, and nothing else. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StudentProfileLoginIntegrationTest {

	private static final String PASSWORD = "example-password";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private UserAccountRepository userAccountRepository;

	@Autowired
	private StudentProfileRepository profileRepository;

	@MockitoBean
	private TuAuthClient tuAuthClient;

	@BeforeEach
	void clearAccounts() {
		profileRepository.deleteAll();
		userAccountRepository.deleteAll();
	}

	@Test
	void firstStudentLoginCreatesProfileWithoutGrantingAnythingElse() throws Exception {
		login(student("0612345678", "ปกติ", null));

		UserAccount account = userAccountRepository.findByTuUsername("0612345678").orElseThrow();
		StudentProfile profile = profileRepository.findById(account.getId()).orElseThrow();
		assertEquals("0612345678", profile.getStudentCode(), "the TU username is kept with its leading zero");
		assertEquals("ACTIVE", profile.getStudentStatus());
		assertEquals("USER", account.getSystemRole());
		assertEquals(0, count("club_memberships"));
		assertEquals(0, count("club_committee_assignments"));
	}

	@Test
	void reloginUpdatesTheSameProfileAsTuStatusChanges() throws Exception {
		login(student("0612345678", "ปกติ", null));
		assertEquals("ACTIVE", statusOf("0612345678"));

		login(student("0612345678", "สำเร็จการศึกษา", "40"));
		assertEquals("GRADUATED", statusOf("0612345678"));

		login(student("0612345678", null, null));
		assertEquals("UNKNOWN", statusOf("0612345678"), "a missing tu_status is never treated as ACTIVE");

		assertEquals(1, profileRepository.count());
	}

	@Test
	void employeeGetsNoProfileAndAFormerStudentLosesTheOldStatus() throws Exception {
		login(employee("staff01"));
		assertEquals(0, profileRepository.count());

		login(student("0612345678", "ปกติ", null));
		login(employee("0612345678"));
		assertEquals("UNKNOWN", statusOf("0612345678"));
	}

	@Test
	void failedProfileWriteLeavesNoAccountOrAuthenticatedSession() throws Exception {
		// student_code is VARCHAR(20), so this identity's profile insert fails in the login transaction.
		String username = "student-account-name-too-long";
		CsrfSession anonymous = csrfSession();
		when(tuAuthClient.authenticate(username, PASSWORD))
				.thenReturn(Optional.of(student(username, "ปกติ", null)));

		assertThrows(Exception.class, () -> mockMvc.perform(loginRequest(username, anonymous)));

		assertTrue(userAccountRepository.findByTuUsername(username).isEmpty(), "the account insert is rolled back");
		mockMvc.perform(get("/api/v1/auth/me").cookie(anonymous.cookie()))
				.andExpect(status().isUnauthorized());
	}

	private void login(TuAuthUser identity) throws Exception {
		when(tuAuthClient.authenticate(identity.username(), PASSWORD)).thenReturn(Optional.of(identity));
		mockMvc.perform(loginRequest(identity.username(), csrfSession())).andExpect(status().isOk());
	}

	private org.springframework.test.web.servlet.RequestBuilder loginRequest(String username, CsrfSession session) {
		return post("/api/v1/auth/login")
				.cookie(session.cookie())
				.header(session.csrf().headerName(), session.csrf().token())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}");
	}

	private CsrfSession csrfSession() throws Exception {
		MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
		Cookie cookie = Arrays.stream(result.getResponse().getCookies())
				.filter(candidate -> "SESSION".equals(candidate.getName()))
				.findFirst()
				.orElseThrow();
		return new CsrfSession(cookie,
				objectMapper.readValue(result.getResponse().getContentAsString(), CsrfTokenResponse.class));
	}

	private String statusOf(String username) {
		Long userId = userAccountRepository.findByTuUsername(username).orElseThrow().getId();
		return profileRepository.findById(userId).orElseThrow().getStudentStatus();
	}

	private int count(String table) {
		return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
	}

	private static TuAuthUser student(String username, String tuStatus, String statusId) {
		return new TuAuthUser(username, "Student", username + "@dome.tu.ac.th", "student",
				"Computer Science", "Science and Technology", tuStatus, statusId);
	}

	private static TuAuthUser employee(String username) {
		return new TuAuthUser(username, "Staff", username + "@tu.ac.th", "employee",
				"Registrar", null, null, null);
	}

	private record CsrfSession(Cookie cookie, CsrfTokenResponse csrf) {
	}
}
