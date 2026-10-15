package com.tu.clubhub.membership.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** The student's current or historical membership in one club. */
@Entity
@Table(name = "club_memberships")
public class ClubMembership {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "club_id", nullable = false)
	private Long clubId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(nullable = false, length = 20)
	private String status = "ACTIVE";

	@Column(name = "joined_at", nullable = false)
	private Instant joinedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Version
	@Column(nullable = false)
	private long version;

	protected ClubMembership() {
	}

	public ClubMembership(Long clubId, Long userId, String status) {
		this.clubId = clubId;
		this.userId = userId;
		this.status = status;
	}

	@PrePersist
	void setTimestamps() {
		Instant now = Instant.now();
		if (joinedAt == null) {
			joinedAt = now;
		}
		updatedAt = now;
	}

	public Long getId() {
		return id;
	}
}
