package com.tu.clubhub.user.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "users")
public class UserAccount {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tu_username", nullable = false, unique = true, length = 100)
	private String tuUsername;

	@Column(name = "display_name", nullable = false, length = 200)
	private String displayName;

	@Column(length = 254)
	private String email;

	@Column(name = "system_role", nullable = false, length = 20)
	private String systemRole = "USER";

	@Column(name = "account_status", nullable = false, length = 20)
	private String accountStatus = "ACTIVE";

	@Column(name = "last_login_at")
	private Instant lastLoginAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Version
	@Column(nullable = false)
	private long version;

	protected UserAccount() {
	}

	public UserAccount(String tuUsername, String displayName, String email, Instant loginTime) {
		this.tuUsername = tuUsername;
		this.displayName = displayName;
		this.email = email;
		this.systemRole = "USER";
		this.accountStatus = "ACTIVE";
		this.lastLoginAt = loginTime;
	}

	public void refreshIdentity(String displayName, String email, Instant loginTime) {
		this.displayName = displayName;
		this.email = email;
		this.lastLoginAt = loginTime;
	}

	@PrePersist
	void setCreationTimes() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
	}

	@PreUpdate
	void setUpdatedTime() {
		updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public String getTuUsername() {
		return tuUsername;
	}

	public String getDisplayName() {
		return displayName;
	}

	public String getEmail() {
		return email;
	}

	public String getSystemRole() {
		return systemRole;
	}

	public String getAccountStatus() {
		return accountStatus;
	}
}
