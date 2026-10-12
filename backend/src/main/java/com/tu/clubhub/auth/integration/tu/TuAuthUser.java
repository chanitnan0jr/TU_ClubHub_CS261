package com.tu.clubhub.auth.integration.tu;

/** Minimal provider-independent identity returned after successful TU authentication. */
public record TuAuthUser(
		String username,
		String displayName,
		String email,
		String accountType,
		String department,
		String faculty) {
}
