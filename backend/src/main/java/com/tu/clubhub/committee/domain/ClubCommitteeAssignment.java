package com.tu.clubhub.committee.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** A retained committee appointment for a membership and a specific term. */
@Entity
@Table(name = "club_committee_assignments")
public class ClubCommitteeAssignment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "membership_id", nullable = false)
	private Long membershipId;

	@Column(name = "position_name", nullable = false, length = 100)
	private String positionName;

	@Column(name = "permission_role", nullable = false, length = 20)
	private String permissionRole = "COMMITTEE";

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	@Column(name = "ends_at", nullable = false)
	private Instant endsAt;

	@Column(nullable = false, length = 20)
	private String status = "ACTIVE";

	@Column(name = "assigned_by", nullable = false)
	private Long assignedBy;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "revoked_by")
	private Long revokedBy;

	@Column(name = "revocation_reason", columnDefinition = "TEXT")
	private String revocationReason;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Version
	@Column(nullable = false)
	private long version;

	protected ClubCommitteeAssignment() {
	}

	public ClubCommitteeAssignment(
			Long membershipId, String positionName, String permissionRole,
			Instant startsAt, Instant endsAt, Long assignedBy) {
		this.membershipId = membershipId;
		this.positionName = positionName;
		this.permissionRole = permissionRole;
		this.startsAt = startsAt;
		this.endsAt = endsAt;
		this.assignedBy = assignedBy;
	}

	@PrePersist
	void setTimestamps() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}
}
