package com.tu.clubhub.committee.security;

import java.time.Clock;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.repository.ClubCommitteeAssignmentRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

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

		return assignmentRepository.existsEffectiveAssignment(principal.userId(), clubId, clock.instant());
	}
}
