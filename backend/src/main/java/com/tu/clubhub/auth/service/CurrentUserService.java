package com.tu.clubhub.auth.service;

import java.time.Clock;

import com.tu.clubhub.auth.dto.CurrentUserResponse.ActiveCommitteeAssignment;
import com.tu.clubhub.auth.dto.CurrentUserResponse.CurrentUser;
import com.tu.clubhub.committee.repository.ClubCommitteeAssignmentRepository;
import com.tu.clubhub.user.domain.StudentProfile;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.repository.StudentProfileRepository;
import com.tu.clubhub.user.repository.UserAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds {@code GET /auth/me} from current database state rather than the session, so a role
 * change, appointment, revocation, or term end shows on the next call. Display data only:
 * every protected operation still authorizes itself.
 */
@Service
public class CurrentUserService {

	private final UserAccountRepository accounts;
	private final StudentProfileRepository studentProfiles;
	private final ClubCommitteeAssignmentRepository assignments;
	private final Clock clock;

	public CurrentUserService(
			UserAccountRepository accounts,
			StudentProfileRepository studentProfiles,
			ClubCommitteeAssignmentRepository assignments,
			Clock clock) {
		this.accounts = accounts;
		this.studentProfiles = studentProfiles;
		this.assignments = assignments;
		this.clock = clock;
	}

	/**
	 * @throws AccountNotAllowedException if the session's account row no longer exists; a
	 *     suspended account is already rejected by {@code ActiveAccountFilter}
	 */
	@Transactional(readOnly = true)
	public CurrentUser describe(Long userId) {
		UserAccount account = accounts.findById(userId).orElseThrow(AccountNotAllowedException::new);
		String studentStatus = studentProfiles.findById(userId)
				.map(StudentProfile::getStudentStatus)
				.orElse(null);
		var active = assignments.findEffectiveAssignmentSummaries(userId, clock.instant()).stream()
				.map(assignment -> new ActiveCommitteeAssignment(
						assignment.getClubId().toString(),
						assignment.getClubName(),
						assignment.getPermissionRole(),
						assignment.getPositionName(),
						assignment.getStartsAt(),
						assignment.getEndsAt()))
				.toList();
		return new CurrentUser(account.getId().toString(), account.getSystemRole(), studentStatus, active);
	}
}
