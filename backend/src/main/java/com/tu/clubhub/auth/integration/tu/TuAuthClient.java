package com.tu.clubhub.auth.integration.tu;

import java.util.Optional;

/** Boundary for authenticating a TU account through the configured TU adapter. */
public interface TuAuthClient {

	/**
	 * Returns the verified TU identity, or an empty result when the credentials are rejected.
	 * Provider outages should be reported as an exception, not as an empty result.
	 */
	Optional<TuAuthUser> authenticate(String username, String password);
}
