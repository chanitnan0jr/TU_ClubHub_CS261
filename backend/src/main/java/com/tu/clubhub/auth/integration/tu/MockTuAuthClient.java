package com.tu.clubhub.auth.integration.tu;

import java.util.Map;
import java.util.Optional;

/** Fixed local/test accounts; this adapter does not accept arbitrary credentials. */
public final class MockTuAuthClient implements TuAuthClient {

	static final String DEMO_USERNAME = "student-demo";
	static final String DEMO_PASSWORD = "tu-clubhub-demo";

	private static final Map<String, DemoAccount> ACCOUNTS = Map.of(
			DEMO_USERNAME,
			new DemoAccount(DEMO_PASSWORD, new TuAuthUser(
					DEMO_USERNAME, "Demo Student", "student-demo@dome.tu.ac.th", "student", "Demo Department", "Demo Faculty",
					"ปกติ", null))
	);

	@Override
	public Optional<TuAuthUser> authenticate(String username, String password) {
		if (username == null || password == null) {
			return Optional.empty();
		}

		DemoAccount account = ACCOUNTS.get(username);
		if (account == null || !account.password().equals(password)) {
			return Optional.empty();
		}

		return Optional.of(account.user());
	}

	private record DemoAccount(String password, TuAuthUser user) {
	}
}
