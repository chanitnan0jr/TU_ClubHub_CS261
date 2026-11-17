package com.tu.clubhub.dev.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import com.tu.clubhub.auth.service.AccountNotAllowedException;
import com.tu.clubhub.dev.config.DevAuthAvailability;
import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.committee.domain.ClubCommitteeAssignment;
import com.tu.clubhub.committee.repository.ClubCommitteeAssignmentRepository;
import com.tu.clubhub.membership.domain.ClubMembership;
import com.tu.clubhub.membership.repository.ClubMembershipRepository;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.UserAccountRepository;
import com.tu.clubhub.user.service.UserAccountService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisions and switches between the four fixed local-dev accounts (USER, ADMIN,
 * COMMITTEE, PRESIDENT) when {@code clubhub.dev=true} and {@code tu.auth.mode=mock}.
 */
@Service
public class DevAuthService {

	private static final String DEFAULT_CLUB_NAME = "ชมรมเขียนโปรแกรม";
	private static final String DEFAULT_CATEGORY_NAME = "เทคโนโลยีและนวัตกรรม";

	public record DevAccountSummary(
			DevMockRole role,
			String username,
			String displayName,
			String label) {
	}

	private final DevAuthAvailability availability;
	private final UserAccountService userAccountService;
	private final UserAccountRepository userAccountRepository;
	private final ClubRepository clubRepository;
	private final ClubMembershipRepository membershipRepository;
	private final ClubCommitteeAssignmentRepository assignmentRepository;
	private final JdbcTemplate jdbcTemplate;
	private final TransactionTemplate transactionTemplate;
	private final Clock clock;

	public DevAuthService(
			DevAuthAvailability availability,
			UserAccountService userAccountService,
			UserAccountRepository userAccountRepository,
			ClubRepository clubRepository,
			ClubMembershipRepository membershipRepository,
			ClubCommitteeAssignmentRepository assignmentRepository,
			JdbcTemplate jdbcTemplate,
			PlatformTransactionManager transactionManager,
			Clock clock) {
		this.availability = availability;
		this.userAccountService = userAccountService;
		this.userAccountRepository = userAccountRepository;
		this.clubRepository = clubRepository;
		this.membershipRepository = membershipRepository;
		this.assignmentRepository = assignmentRepository;
		this.jdbcTemplate = jdbcTemplate;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
		this.clock = clock;
	}

	public List<DevAccountSummary> listAccounts() {
		requireEnabled();
		return Arrays.stream(DevMockRole.values())
				.map(role -> new DevAccountSummary(role, role.username(), role.displayName(), role.label()))
				.toList();
	}

	public UserAccount switchTo(DevMockRole role) {
		requireEnabled();
		if (role == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
		}

		userAccountService.provisionAfterVerifiedLogin(
				role.username(), role.displayName(), role.email(), role.studentIdentity());

		return transactionTemplate.execute(status -> {
			UserAccount account = userAccountRepository.findByTuUsernameForUpdate(role.username())
					.orElseThrow();
			if (!"ACTIVE".equals(account.getAccountStatus())) {
				throw new AccountNotAllowedException();
			}
			if (!role.systemRole().equals(account.getSystemRole())) {
				account.assignSystemRole(role.systemRole());
				account = userAccountRepository.saveAndFlush(account);
			}
			if (role.clubPermissionRole() != null) {
				ensureClubAssignment(account, role);
			}
			return account;
		});
	}

	private void ensureClubAssignment(UserAccount account, DevMockRole role) {
		Instant now = clock.instant();
		Long clubId = ensureTargetClubId(account.getId());

		ClubMembership membership = membershipRepository.findByClubIdAndUserId(clubId, account.getId())
				.map(existing -> {
					existing.activate(now.minusSeconds(60));
					return membershipRepository.saveAndFlush(existing);
				})
				.orElseGet(() -> membershipRepository.saveAndFlush(
						new ClubMembership(clubId, account.getId(), "ACTIVE", now.minusSeconds(60))));

		boolean hasRole = assignmentRepository.findEffectiveAssignments(account.getId(), clubId, now).stream()
				.anyMatch(assignment -> role.clubPermissionRole().equals(assignment.getPermissionRole()));
		if (!hasRole) {
			assignmentRepository.saveAndFlush(new ClubCommitteeAssignment(
					membership.getId(),
					role.positionName(),
					role.clubPermissionRole(),
					now.minusSeconds(1),
					now.plus(365, ChronoUnit.DAYS),
					account.getId()));
		}
	}

	private Long ensureTargetClubId(Long creatorUserId) {
		return clubRepository.findByName(DEFAULT_CLUB_NAME)
				.filter(club -> "ACTIVE".equals(club.getStatus()))
				.map(Club::getId)
				.or(() -> clubRepository.findByStatus("ACTIVE").stream()
						.min(Comparator.comparing(Club::getId))
						.map(Club::getId))
				.orElseGet(() -> createFallbackClub(creatorUserId));
	}

	private Long createFallbackClub(Long creatorUserId) {
		Long categoryId = ensureCategoryId();
		try {
			Club club = clubRepository.saveAndFlush(new Club(
					categoryId,
					DEFAULT_CLUB_NAME,
					"ชมรมตัวอย่างสำหรับทดสอบระบบ (Dev)",
					creatorUserId));
			return club.getId();
		} catch (DataIntegrityViolationException concurrentInsert) {
			return clubRepository.findByName(DEFAULT_CLUB_NAME)
					.map(Club::getId)
					.orElseThrow(() -> concurrentInsert);
		}
	}

	private Long ensureCategoryId() {
		List<Long> ids = jdbcTemplate.query(
				"SELECT id FROM club_categories ORDER BY id",
				(rs, rowNum) -> rs.getLong("id"));
		if (!ids.isEmpty()) {
			return ids.get(0);
		}
		try {
			jdbcTemplate.update(
					"INSERT INTO club_categories (name, description) VALUES (?, ?)",
					DEFAULT_CATEGORY_NAME,
					"หมวดหมู่ชมรมตัวอย่างสำหรับทดสอบระบบ");
		} catch (DataIntegrityViolationException ignored) {
			// Concurrent request inserted the default category first.
		}
		return jdbcTemplate.queryForObject(
				"SELECT id FROM club_categories WHERE name = ?",
				Long.class,
				DEFAULT_CATEGORY_NAME);
	}

	private void requireEnabled() {
		if (!availability.isEnabled()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}
	}
}
