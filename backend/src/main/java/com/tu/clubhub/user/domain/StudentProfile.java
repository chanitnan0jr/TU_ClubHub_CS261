package com.tu.clubhub.user.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** TU-verified student data. Columns not written at login (program, study year) keep their stored values. */
@Entity
@Table(name = "student_profiles")
public class StudentProfile {

	@Id
	@Column(name = "user_id")
	private Long userId;

	// NOT NULL is enforced by the Flyway schema; H2 tests insert partial rows.
	@Column(name = "student_code", length = 20)
	private String studentCode;

	@Column(name = "faculty_name", length = 200)
	private String facultyName;

	@Column(name = "department_name", length = 200)
	private String departmentName;

	@Column(name = "student_status", length = 20)
	private String studentStatus;

	@Column(name = "synced_at")
	private Instant syncedAt;

	protected StudentProfile() {
	}

	public StudentProfile(Long userId, String studentCode) {
		this.userId = userId;
		this.studentCode = studentCode;
	}

	public void sync(String facultyName, String departmentName, String studentStatus, Instant syncedAt) {
		this.facultyName = facultyName;
		this.departmentName = departmentName;
		this.studentStatus = studentStatus;
		this.syncedAt = syncedAt;
	}

	public void markUnknown(Instant syncedAt) {
		this.studentStatus = "UNKNOWN";
		this.syncedAt = syncedAt;
	}

	public String getStudentCode() {
		return studentCode;
	}

	public String getStudentStatus() {
		return studentStatus;
	}
}
