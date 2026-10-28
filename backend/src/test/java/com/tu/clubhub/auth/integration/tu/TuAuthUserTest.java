package com.tu.clubhub.auth.integration.tu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

class TuAuthUserTest {

	@Test
	void mapsOnlyDocumentedTuStatuses() {
		assertEquals("ACTIVE", student(" ปกติ ", null).studentStatus());
		assertEquals("INACTIVE", student("พักการศึกษา", null).studentStatus());
		assertEquals("INACTIVE", student("ลาออก", null).studentStatus());
		assertEquals("GRADUATED", student("สำเร็จการศึกษา", "40").studentStatus());
	}

	@Test
	void missingUnknownOrContradictoryStatusIsUnknown() {
		assertEquals("UNKNOWN", student(null, null).studentStatus());
		assertEquals("UNKNOWN", student("", null).studentStatus());
		assertEquals("UNKNOWN", student("Normal", null).studentStatus());
		assertEquals("UNKNOWN", student("ปกติ", "40").studentStatus(), "statusid 40 is documented as graduated");
	}

	@Test
	void onlyStudentAccountTypeIsAStudent() {
		assertFalse(new TuAuthUser("staff01", "Staff", null, "employee", null, null, "ปกติ", null).isStudent());
	}

	private static TuAuthUser student(String tuStatus, String statusId) {
		return new TuAuthUser("6409000001", "Student", null, "student", null, null, tuStatus, statusId);
	}
}
