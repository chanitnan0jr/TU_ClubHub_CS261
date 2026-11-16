package com.tu.clubhub.dev.service;

import com.tu.clubhub.user.service.UserAccountService.StudentIdentity;

/** Fixed local-dev accounts for switching between the four application roles. */
public enum DevMockRole {
	USER(
			"applicant-demo",
			"Demo Applicant",
			"applicant-demo@dome.tu.ac.th",
			"นักศึกษาทั่วไป",
			"USER",
			true,
			null,
			null
	),
	ADMIN(
			"admin-demo",
			"Demo Admin",
			"admin-demo@dome.tu.ac.th",
			"ผู้ดูแลระบบ",
			"ADMIN",
			false,
			null,
			null
	),
	COMMITTEE(
			"committee-demo",
			"Demo Committee",
			"committee-demo@dome.tu.ac.th",
			"กรรมการชมรม",
			"USER",
			true,
			"COMMITTEE",
			"กรรมการชมรม (dev)"
	),
	PRESIDENT(
			"student-demo",
			"Demo Student",
			"student-demo@dome.tu.ac.th",
			"ประธานชมรม",
			"USER",
			true,
			"PRESIDENT",
			"ประธานชมรม (dev)"
	);

	private final String username;
	private final String displayName;
	private final String email;
	private final String label;
	private final String systemRole;
	private final boolean student;
	private final String clubPermissionRole;
	private final String positionName;

	DevMockRole(
			String username,
			String displayName,
			String email,
			String label,
			String systemRole,
			boolean student,
			String clubPermissionRole,
			String positionName) {
		this.username = username;
		this.displayName = displayName;
		this.email = email;
		this.label = label;
		this.systemRole = systemRole;
		this.student = student;
		this.clubPermissionRole = clubPermissionRole;
		this.positionName = positionName;
	}

	public String username() {
		return username;
	}

	public String displayName() {
		return displayName;
	}

	public String email() {
		return email;
	}

	public String label() {
		return label;
	}

	public String systemRole() {
		return systemRole;
	}

	public StudentIdentity studentIdentity() {
		return student ? new StudentIdentity(username, "Demo Faculty", "Demo Department", "ACTIVE") : null;
	}

	public String clubPermissionRole() {
		return clubPermissionRole;
	}

	public String positionName() {
		return positionName;
	}
}
