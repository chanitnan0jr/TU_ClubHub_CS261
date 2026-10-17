package com.tu.clubhub.committee.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.domain.ClubCommitteeAssignment;
import com.tu.clubhub.committee.repository.ClubCommitteeAssignmentRepository;
import com.tu.clubhub.membership.domain.ClubMembership;
import com.tu.clubhub.membership.repository.ClubMembershipRepository;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.UserAccountRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(CommitteeMethodSecurityIntegrationTest.SecurityProbeController.class)
class CommitteeMethodSecurityIntegrationTest {

	private static final Long TARGET_CLUB_ID = 41L;
	private static final Long OTHER_CLUB_ID = 42L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserAccountRepository userAccountRepository;

	@Autowired
	private ClubMembershipRepository membershipRepository;

	@Autowired
	private ClubCommitteeAssignmentRepository assignmentRepository;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private ClubSecurity clubSecurity;

	private UserAccount committeeAccount;

	@BeforeEach
	void cleanDatabase() {
		SecurityContextHolder.clearContext();
		assignmentRepository.deleteAll();
		membershipRepository.deleteAll();
		userAccountRepository.deleteAll();
		committeeAccount = userAccountRepository.saveAndFlush(
				new UserAccount("committee-test", "Committee Test", null, Instant.now()));
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void activeCommitteeCanAccessAssignedClub() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isOk());
	}

	@Test
	void committeeOfAnotherClubIsForbidden() throws Exception {
		grantCommittee(OTHER_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isForbidden());
	}

	@Test
	void ordinaryClubMemberWithoutCommitteeAssignmentIsForbidden() throws Exception {
		membershipRepository.saveAndFlush(new ClubMembership(TARGET_CLUB_ID, committeeAccount.getId(), "ACTIVE"));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void unauthenticatedUserIsUnauthorized() throws Exception {
		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void unknownClubIdIsForbidden() throws Exception {
		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", 999999L)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void suspendedAccountCannotUseCommitteeAssignment() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));
		jdbcTemplate.update("UPDATE users SET account_status = 'SUSPENDED' WHERE id = ?", committeeAccount.getId());

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void nullClubIdAndMissingOrAnonymousAuthenticationReturnFalse() {
		SecurityContextHolder.clearContext();
		assertFalse(clubSecurity.isCommittee(null));
		assertFalse(clubSecurity.isCommittee(TARGET_CLUB_ID));

		SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
				"test-key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
		assertFalse(clubSecurity.isCommittee(TARGET_CLUB_ID));

		SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
				"anonymousUser", null, List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
		assertFalse(clubSecurity.isCommittee(TARGET_CLUB_ID));
	}

	@Test
	void missingClubIdRouteDoesNotCauseAnInternalServerError() throws Exception {
		mockMvc.perform(put("/api/v1/test/clubs")
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isNotFound());
	}

	@Test
	void expiredAppointmentDoesNotAuthorize() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(7200), Instant.now().minusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void revokedAppointmentDoesNotAuthorize() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));
		jdbcTemplate.update("""
				UPDATE club_committee_assignments
				SET status = 'REVOKED', revoked_at = ?, revoked_by = ?
				""", Instant.now(), committeeAccount.getId());

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void futureAppointmentDoesNotAuthorize() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "COMMITTEE", Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void inactiveMembershipDoesNotAuthorizeEvenWithActiveAssignment() throws Exception {
		ClubMembership membership = membershipRepository.saveAndFlush(
				new ClubMembership(TARGET_CLUB_ID, committeeAccount.getId(), "INACTIVE"));
		assignmentRepository.saveAndFlush(new ClubCommitteeAssignment(
				membership.getId(), "Committee Member", "COMMITTEE",
				Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600), committeeAccount.getId()));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void endedMembershipDoesNotAuthorizeEvenWithActiveAssignment() throws Exception {
		ClubMembership membership = membershipRepository.saveAndFlush(
				new ClubMembership(TARGET_CLUB_ID, committeeAccount.getId(), "ACTIVE"));
		jdbcTemplate.update("UPDATE club_memberships SET ended_at = ? WHERE id = ?",
				Instant.now().minusSeconds(60), membership.getId());
		assignmentRepository.saveAndFlush(new ClubCommitteeAssignment(
				membership.getId(), "Committee Member", "COMMITTEE",
				Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600), committeeAccount.getId()));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void activePresidentCanAccessAssignedClub() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "PRESIDENT", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON))
			.andExpect(status().isOk());
	}

	@Test
	void unauthorizedRoleSuchAsAdvisorDoesNotAuthorize() throws Exception {
		grantCommittee(TARGET_CLUB_ID, "ADVISOR", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden());
	}

	@Test
	void forbiddenResponseMatchesRfc7807ProblemDetailsContract() throws Exception {
		grantCommittee(OTHER_CLUB_ID, "COMMITTEE", Instant.now().minusSeconds(60), Instant.now().plusSeconds(3600));

		mockMvc.perform(put("/api/v1/test/clubs/{clubId}", TARGET_CLUB_ID)
				.with(authentication(authenticationFor(committeeAccount)))
				.with(csrf()))
			.andExpect(status().isForbidden())
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Content-Type", org.hamcrest.Matchers.containsString("application/problem+json")))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.type").value("urn:tuclubhub:problem:access-denied"))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.title").value("Access denied"))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.status").value(403))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.detail").value("You are not allowed to access this resource."))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.instance").value("/api/v1/test/clubs/" + TARGET_CLUB_ID))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("ACCESS_DENIED"))
			.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.traceId").isNotEmpty());
	}

	private void grantCommittee(Long clubId, String permission, Instant startsAt, Instant endsAt) {
		ClubMembership membership = membershipRepository.saveAndFlush(
				new ClubMembership(clubId, committeeAccount.getId(), "ACTIVE"));
		assignmentRepository.saveAndFlush(new ClubCommitteeAssignment(
				membership.getId(), "Committee Member", permission,
				startsAt, endsAt, committeeAccount.getId()));
	}

	private static UsernamePasswordAuthenticationToken authenticationFor(UserAccount account) {
		ClubHubPrincipal principal = new ClubHubPrincipal(account.getId(), account.getTuUsername(), account.getSystemRole());
		return UsernamePasswordAuthenticationToken.authenticated(
				principal, null, List.of());
	}

	@RestController
	static class SecurityProbeController {

		@PutMapping("/api/v1/test/clubs/{clubId}")
		@RequireClubCommittee
		String updateClub(@PathVariable("clubId") Long clubId) {
			return "updated";
		}
	}
}
