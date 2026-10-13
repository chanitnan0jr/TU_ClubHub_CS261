package com.tu.clubhub.auth.integration.tu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MockTuAuthClientTest {

	private final MockTuAuthClient client = new MockTuAuthClient();

	@Test
	void authenticatesTheConfiguredDemoAccount() {
		var result = client.authenticate(MockTuAuthClient.DEMO_USERNAME, MockTuAuthClient.DEMO_PASSWORD);

		assertTrue(result.isPresent());
		assertEquals("Demo Student", result.orElseThrow().displayName());
		assertEquals("student", result.orElseThrow().accountType());
	}

	@Test
	void rejectsUnknownAccountsAndIncorrectPasswords() {
		assertTrue(client.authenticate("unknown-student", "any-password").isEmpty());
		assertTrue(client.authenticate(MockTuAuthClient.DEMO_USERNAME, "incorrect-password").isEmpty());
	}

	@Test
	void rejectsNullCredentials() {
		assertTrue(client.authenticate(null, MockTuAuthClient.DEMO_PASSWORD).isEmpty());
		assertTrue(client.authenticate(MockTuAuthClient.DEMO_USERNAME, null).isEmpty());
	}
}
