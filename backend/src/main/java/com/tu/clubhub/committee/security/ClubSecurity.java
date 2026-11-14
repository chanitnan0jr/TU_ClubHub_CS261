package com.tu.clubhub.committee.security;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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

	/** Retain only grants locked before a resource lock; never acquire new grants after waiting. */
	public record WritePermission(long userId, long clubId, Set<Long> assignmentIds, boolean presidentOnly) {
		public WritePermission { assignmentIds = Set.copyOf(assignmentIds); }
	}

	public Optional<WritePermission> lockWritePermission(Long clubId, boolean presidentOnly) {
		if (!TransactionSynchronizationManager.isActualTransactionActive()
				|| TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
			throw new IllegalStateException("Write authorization requires a write transaction");
		}
		Long userId = principalId();
		if (clubId == null || userId == null) return Optional.empty();
		Set<Long> ids = assignmentRepository.lockEffectiveAssignments(userId, clubId, clock.instant()).stream()
				.filter(a -> !presidentOnly || "PRESIDENT".equals(a.getPermissionRole()))
				.map(a -> a.getId()).collect(Collectors.toSet());
		return ids.isEmpty() ? Optional.empty()
				: Optional.of(new WritePermission(userId, clubId, ids, presidentOnly));
	}

	/** Recheck current eligibility/term at the final write instant without reversing lock order. */
	public boolean hasPermissionAt(WritePermission permission, Instant at) {
		if (!Long.valueOf(permission.userId()).equals(principalId())) return false;
		return assignmentRepository.findEffectiveAssignments(permission.userId(), permission.clubId(), at).stream()
				.anyMatch(a -> permission.assignmentIds().contains(a.getId())
						&& (!permission.presidentOnly() || "PRESIDENT".equals(a.getPermissionRole())));
	}

	private static Long principalId() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)
				&& auth.getPrincipal() instanceof ClubHubPrincipal p ? p.userId() : null;
	}
}
