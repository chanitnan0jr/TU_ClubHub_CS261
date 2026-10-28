package com.tu.clubhub.committee.security;

import java.time.Clock;
import java.time.Instant;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.repository.ClubCommitteeAssignmentRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** SpEL authorization helper for club- and term-scoped committee permissions. */
@Component("clubSecurity")
public class ClubSecurity {

	private final ClubCommitteeAssignmentRepository assignmentRepository;
	private final Clock clock;

	public ClubSecurity(ClubCommitteeAssignmentRepository assignmentRepository, Clock clock) {
		this.assignmentRepository = assignmentRepository;
		this.clock = clock;
	}

	public boolean isCommittee(Long clubId) {
		if (clubId == null) {
			return false;
		}

		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null
				|| !authentication.isAuthenticated()
				|| authentication instanceof AnonymousAuthenticationToken
				|| !(authentication.getPrincipal() instanceof ClubHubPrincipal principal)
				|| principal.userId() == null) {
			return false;
		}

		// A check inside a write transaction holds the granting assignment until commit (matrix §7.4).
		boolean writing = TransactionSynchronizationManager.isActualTransactionActive()
				&& !TransactionSynchronizationManager.isCurrentTransactionReadOnly();
		Instant now = clock.instant();
		return !(writing
				? assignmentRepository.lockEffectiveAssignments(principal.userId(), clubId, now)
				: assignmentRepository.findEffectiveAssignments(principal.userId(), clubId, now)).isEmpty();
	}
}
