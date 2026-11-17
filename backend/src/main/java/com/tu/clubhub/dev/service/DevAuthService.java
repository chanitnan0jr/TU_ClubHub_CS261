package com.tu.clubhub.dev.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

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

		Long targetClubId = role.clubPermissionRole() != null
				? ensureTargetClubId(role.username())
				: null;

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
				ensureClubAssignment(account, role, targetClubId);
			}
			return account;
		});
	}

	private void ensureClubAssignment(UserAccount account, DevMockRole role, Long clubId) {
		Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);

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
			Instant defaultEnd = now.plus(365, ChronoUnit.DAYS);
			Instant endsAt = assignmentRepository
					.findNextScheduledStart(membership.getId(), role.clubPermissionRole(), now)
					.filter(nextStart -> nextStart.isBefore(defaultEnd))
					.orElse(defaultEnd);
			assignmentRepository.saveAndFlush(new ClubCommitteeAssignment(
					membership.getId(),
					role.positionName(),
					role.clubPermissionRole(),
					now,
					endsAt,
					account.getId()));
		}
	}

	private Long ensureTargetClubId(String creatorUsername) {
		return findExistingActiveClubId()
				.orElseGet(() -> createFallbackClub(creatorUsername));
	}

	private Optional<Long> findExistingActiveClubId() {
		return transactionTemplate.execute(status -> clubRepository.findByName(DEFAULT_CLUB_NAME)
				.filter(club -> "ACTIVE".equals(club.getStatus()))
				.map(Club::getId)
				.or(() -> clubRepository.findByStatus("ACTIVE").stream()
						.min(Comparator.comparing(Club::getId))
						.map(Club::getId)));
	}

	private Long createFallbackClub(String creatorUsername) {
		Long categoryId = ensureCategoryId();
		try {
			return transactionTemplate.execute(status -> {
				Long creatorUserId = userAccountRepository.findByTuUsername(creatorUsername)
						.orElseThrow()
						.getId();
				Club club = clubRepository.saveAndFlush(new Club(
						categoryId,
						DEFAULT_CLUB_NAME,
						"ชมรมตัวอย่างสำหรับทดสอบระบบ (Dev)",
						creatorUserId));
				return club.getId();
			});
		} catch (DataIntegrityViolationException concurrentInsert) {
			// Run the lookup in a fresh transaction so PostgreSQL does not reject it after rollback.
			return transactionTemplate.execute(status -> clubRepository.findByName(DEFAULT_CLUB_NAME)
					.map(Club::getId)
					.orElseThrow(() -> concurrentInsert));
		}
	}

	private Long ensureCategoryId() {
		Optional<Long> existing = transactionTemplate.execute(status -> {
			List<Long> ids = jdbcTemplate.query(
					"SELECT id FROM club_categories ORDER BY id",
					(rs, rowNum) -> rs.getLong("id"));
			return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
		});
		if (existing.isPresent()) {
			return existing.get();
		}
		try {
			transactionTemplate.executeWithoutResult(status -> jdbcTemplate.update(
					"INSERT INTO club_categories (name, description) VALUES (?, ?)",
					DEFAULT_CATEGORY_NAME,
					"หมวดหมู่ชมรมตัวอย่างสำหรับทดสอบระบบ"));
		} catch (DataIntegrityViolationException ignored) {
			// Concurrent request inserted the default category first; read it in a new transaction below.
		}
		return transactionTemplate.execute(status -> jdbcTemplate.queryForObject(
				"SELECT id FROM club_categories WHERE name = ?",
				Long.class,
				DEFAULT_CATEGORY_NAME));
	}

	private void requireEnabled() {
		if (!availability.isEnabled()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}
	}
}
