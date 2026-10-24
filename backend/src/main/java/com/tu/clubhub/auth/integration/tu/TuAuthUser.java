package com.tu.clubhub.auth.integration.tu;

import java.util.Map;

/** Minimal provider-independent identity returned after successful TU authentication. */
public record TuAuthUser(
		String username,
		String displayName,
		String email,
		String accountType,
		String department,
		String faculty,
		String tuStatus,
		String statusId) {

	// Only the tu_status values documented in docs/api/TU_API.md §3.3.
	private static final Map<String, String> STUDENT_STATUSES = Map.of(
			"ปกติ", "ACTIVE",
			"พักการศึกษา", "INACTIVE",
			"ลาออก", "INACTIVE",
			"สำเร็จการศึกษา", "GRADUATED");

	// The only documented statusid pairing (§3.3 example); the full code list is unpublished.
	private static final String GRADUATED_STATUS_ID = "40";

	public boolean isStudent() {
		return "student".equals(accountType);
	}

	/** The student_profiles status; missing, unknown, or contradictory TU values are UNKNOWN. */
	public String studentStatus() {
		String status = tuStatus == null ? "UNKNOWN" : STUDENT_STATUSES.getOrDefault(tuStatus.strip(), "UNKNOWN");
		if (GRADUATED_STATUS_ID.equals(statusId) && !"GRADUATED".equals(status)) {
			return "UNKNOWN";
		}
		return status;
	}
}
