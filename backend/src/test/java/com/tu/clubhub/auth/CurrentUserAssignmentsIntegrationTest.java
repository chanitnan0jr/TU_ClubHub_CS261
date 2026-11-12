package com.tu.clubhub.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * GET /auth/me lists exactly the assignments that currently grant committee rights, using the
 * same rule as committee authorization, against the real PostgreSQL schema.
 */
@SpringBootTest(properties = {
		"spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_test}",
		"spring.datasource.username=postgres",
		"spring.datasource.password=${DB_PASSWORD}",
		"spring.flyway.enabled=true",
		"spring.flyway.locations=classpath:db/migration",
		"spring.jpa.hibernate.ddl-auto=validate",
		"spring.session.jdbc.initialize-schema=never",
		"tu.auth.mode=mock"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CurrentUserAssignmentsIntegrationTest {

	private static final Duration DAY = Duration.ofDays(1);
	private static final Duration HOUR = Duration.ofHours(1);

	@Autowired private MockMvc mvc;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private Clock clock;

	private Instant now;
	private Long categoryId;

	@BeforeEach
	void setUp() {
		// Whole seconds keep the expected JSON timestamps exact.
		now = clock.instant().truncatedTo(ChronoUnit.SECONDS);
		categoryId = jdbc.queryForObject(
				"INSERT INTO club_categories (name) VALUES (?) RETURNING id",
				Long.class, "me-category-" + UUID.randomUUID());
	}

	@Test
	void listsOnlyAssignmentsThatCurrentlyGrantCommitteeRights() throws Exception {
		Long userId = createUser("ACTIVE");
		Long activeClub = createClub("ACTIVE");
		assign(member(activeClub, userId), "PRESIDENT", now.minus(DAY), now.plus(DAY));

		assign(member(createClub("ACTIVE"), userId), "COMMITTEE", now.minus(DAY), now.minus(HOUR));
		assign(member(createClub("ACTIVE"), userId), "COMMITTEE", now.plus(HOUR), now.plus(DAY));
		revoke(assign(member(createClub("ACTIVE"), userId), "COMMITTEE", now.minus(DAY), now.plus(DAY)), userId);
		assign(endedMember(createClub("ACTIVE"), userId), "COMMITTEE", now.minus(DAY), now.plus(DAY));
		assign(member(createClub("INACTIVE"), userId), "COMMITTEE", now.minus(DAY), now.plus(DAY));
		Long otherUser = createUser("ACTIVE");
		assign(member(createClub("ACTIVE"), otherUser), "COMMITTEE", now.minus(DAY), now.plus(DAY));

		me(userId)
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsString("no-store")))
				.andExpect(jsonPath("$.user.id").value(userId.toString()))
				.andExpect(jsonPath("$.user.role").value("USER"))
				.andExpect(jsonPath("$.user.studentStatus").value("ACTIVE"))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments", hasSize(1)))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].clubId").value(activeClub.toString()))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].clubName").value(clubName(activeClub)))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].permissionRole").value("PRESIDENT"))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].positionName").value("Position PRESIDENT"))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].startsAt").value(now.minus(DAY).toString()))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments[0].endsAt").value(now.plus(DAY).toString()));
	}

	@Test
	void userWithoutAssignmentsGetsEmptyArray() throws Exception {
		me(createUser("ACTIVE"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.studentStatus").value("ACTIVE"))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments", hasSize(0)));
	}

	@Test
	void inactiveStudentStatusHidesAssignments() throws Exception {
		Long userId = createUser("INACTIVE");
		assign(member(createClub("ACTIVE"), userId), "COMMITTEE", now.minus(DAY), now.plus(DAY));

		me(userId)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.studentStatus").value("INACTIVE"))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments", hasSize(0)));
	}

	@Test
	void roleAndStudentStatusComeFromTheDatabaseNotTheSession() throws Exception {
		Long userId = jdbc.queryForObject("""
				INSERT INTO users (tu_username, display_name, system_role)
				VALUES (?, 'Me admin test user', 'ADMIN') RETURNING id
				""", Long.class, "me-admin-" + UUID.randomUUID());

		// The session principal still says USER and there is no student profile.
		me(userId)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.role").value("ADMIN"))
				.andExpect(jsonPath("$.user.displayName").value("Me admin test user"))
				.andExpect(jsonPath("$.user.studentCode").value(nullValue()))
				.andExpect(jsonPath("$.user.email").value(nullValue()))
				.andExpect(jsonPath("$.user.facultyName").value(nullValue()))
				.andExpect(jsonPath("$.user.studentStatus").value(nullValue()))
				.andExpect(jsonPath("$.user.activeCommitteeAssignments", hasSize(0)));
	}

	@Test
	void returnsOnlyTheAuthenticatedAccountsProfile() throws Exception {
		Long owner = createUser("ACTIVE");
		Long other = createUser("ACTIVE");
		jdbc.update("UPDATE users SET display_name = ?, email = ? WHERE id = ?",
				"Owner name", "owner@example.edu", owner);
		jdbc.update("UPDATE student_profiles SET student_code = ?, faculty_name = ? WHERE user_id = ?",
				"owner-student", "Owner faculty", owner);
		jdbc.update("UPDATE users SET display_name = ?, email = ? WHERE id = ?",
				"Other name", "other@example.edu", other);

		me(owner)
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsString("no-store")))
				.andExpect(jsonPath("$.user.displayName").value("Owner name"))
				.andExpect(jsonPath("$.user.studentCode").value("owner-student"))
				.andExpect(jsonPath("$.user.email").value("owner@example.edu"))
				.andExpect(jsonPath("$.user.facultyName").value("Owner faculty"));
		me(other)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.displayName").value("Other name"))
				.andExpect(jsonPath("$.user.email").value("other@example.edu"))
				.andExpect(jsonPath("$.user.facultyName").value(nullValue()));
	}

	@Test
	void sessionForAMissingAccountIsNotAllowed() throws Exception {
		me(Long.MAX_VALUE)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ALLOWED"));
	}

	private ResultActions me(Long userId) throws Exception {
		var principal = new ClubHubPrincipal(userId, "me-test-" + userId, "USER");
		return mvc.perform(get("/api/v1/auth/me").with(authentication(
				UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()))));
	}

	private Long createUser(String studentStatus) {
		String suffix = UUID.randomUUID().toString();
		Long userId = jdbc.queryForObject("""
				INSERT INTO users (tu_username, display_name)
				VALUES (?, 'Me test user') RETURNING id
				""", Long.class, "me-user-" + suffix);
		jdbc.update("""
				INSERT INTO student_profiles (user_id, student_code, student_status)
				VALUES (?, ?, ?)
				""", userId, "M-" + suffix.replace("-", "").substring(0, 16), studentStatus);
		return userId;
	}

	private Long createClub(String status) {
		Long creator = jdbc.queryForObject("""
				INSERT INTO users (tu_username, display_name)
				VALUES (?, 'Me club creator') RETURNING id
				""", Long.class, "me-creator-" + UUID.randomUUID());
		return jdbc.queryForObject("""
				INSERT INTO clubs (category_id, name, description, status, created_by)
				VALUES (?, ?, 'Me test club', ?, ?) RETURNING id
				""", Long.class, categoryId, "me-club-" + UUID.randomUUID(), status, creator);
	}

	private String clubName(Long clubId) {
		return jdbc.queryForObject("SELECT name FROM clubs WHERE id = ?", String.class, clubId);
	}

	private Long member(Long clubId, Long userId) {
		return jdbc.queryForObject("""
				INSERT INTO club_memberships (club_id, user_id, status, joined_at)
				VALUES (?, ?, 'ACTIVE', ?) RETURNING id
				""", Long.class, clubId, userId, at(now.minus(DAY.multipliedBy(2))));
	}

	private Long endedMember(Long clubId, Long userId) {
		return jdbc.queryForObject("""
				INSERT INTO club_memberships (club_id, user_id, status, joined_at, ended_at)
				VALUES (?, ?, 'LEFT', ?, ?) RETURNING id
				""", Long.class, clubId, userId, at(now.minus(DAY.multipliedBy(2))), at(now.minus(HOUR)));
	}

	private Long assign(Long membershipId, String role, Instant startsAt, Instant endsAt) {
		return jdbc.queryForObject("""
				INSERT INTO club_committee_assignments
				    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
				VALUES (?, ?, ?, ?, ?,
				        (SELECT user_id FROM club_memberships WHERE id = ?))
				RETURNING id
				""", Long.class, membershipId, "Position " + role, role, at(startsAt), at(endsAt), membershipId);
	}

	private void revoke(Long assignmentId, Long revokedBy) {
		jdbc.update("""
				UPDATE club_committee_assignments
				SET status = 'REVOKED', revoked_at = created_at, revoked_by = ?
				WHERE id = ?
				""", revokedBy, assignmentId);
	}

	private static java.time.OffsetDateTime at(Instant instant) {
		return instant.atOffset(ZoneOffset.UTC);
	}
}
