package com.tu.clubhub.auth.service;

public class LoginRateLimitedException extends RuntimeException {

	private final long retryAfterSeconds;

	public LoginRateLimitedException(long retryAfterSeconds) {
		this.retryAfterSeconds = retryAfterSeconds;
	}

	public long retryAfterSeconds() {
		return retryAfterSeconds;
	}
}
