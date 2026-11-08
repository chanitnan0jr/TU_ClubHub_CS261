package com.tu.clubhub.auth.dto;

import java.time.Instant;
import java.util.List;

/** {@code GET /auth/me} body; the {@code CurrentUserResponse} schema in openapi.yaml. */
public record CurrentUserResponse(CurrentUser user) {

	/** Identity returned at login: id and role only. */
	public record UserSummary(String id, String role) {
	}

	/** The account as stored now; {@code studentStatus} is null without a student profile. */
	public record CurrentUser(
			String id,
			String role,
			String studentStatus,
			List<ActiveCommitteeAssignment> activeCommitteeAssignments) {

		public CurrentUser {
			activeCommitteeAssignments = List.copyOf(activeCommitteeAssignments);
		}
	}

	public record ActiveCommitteeAssignment(
			String clubId,
			String clubName,
			String permissionRole,
			String positionName,
			Instant startsAt,
			Instant endsAt) {
	}
}
