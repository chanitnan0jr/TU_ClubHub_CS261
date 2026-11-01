package com.tu.clubhub.auth.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class LoginRateLimiterTest {

	private final TestClock clock = new TestClock();
	private final LoginRateLimiter limiter =
			new LoginRateLimiter(clock, 3, Duration.ofMinutes(10), 2, Duration.ofMinutes(15));

	@Test
	void blocksAUsernameAfterItsAttemptsAndTellsWhenToRetry() {
		limiter.acquire("203.0.113.1", "student-demo");
		limiter.acquire("203.0.113.2", "student-demo");
		clock.advance(Duration.ofMinutes(5));

		LoginRateLimitedException limited =
				assertThrows(LoginRateLimitedException.class, () -> limiter.acquire("203.0.113.3", " Student-Demo "));
		assertEquals(Duration.ofMinutes(10).toSeconds(), limited.retryAfterSeconds());

		clock.advance(Duration.ofMinutes(10));
		assertDoesNotThrow(() -> limiter.acquire("203.0.113.3", "student-demo"));
	}

	@Test
	void verifiedCredentialsClearTheUsernameButNotTheClient() {
		limiter.acquire("203.0.113.1", "student-demo");
		limiter.acquire("203.0.113.1", "student-demo");
		limiter.recordSuccess("student-demo");

		limiter.acquire("203.0.113.1", "student-demo");
		assertThrows(LoginRateLimitedException.class, () -> limiter.acquire("203.0.113.1", "someone-else"));
	}

	@Test
	void blocksAClientThatTriesManyUsernames() {
		limiter.acquire("203.0.113.1", "user-1");
		limiter.acquire("203.0.113.1", "user-2");
		limiter.acquire("203.0.113.1", "user-3");

		assertThrows(LoginRateLimitedException.class, () -> limiter.acquire("203.0.113.1", "user-4"));
		assertDoesNotThrow(() -> limiter.acquire("203.0.113.9", "user-4"));
	}

	@Test
	void refusesNonPositiveLimits() {
		assertThrows(IllegalArgumentException.class,
				() -> new LoginRateLimiter(clock, 0, Duration.ofMinutes(10), 2, Duration.ofMinutes(15)));
		assertThrows(IllegalArgumentException.class,
				() -> new LoginRateLimiter(clock, 3, Duration.ZERO, 2, Duration.ofMinutes(15)));
	}

	private static final class TestClock extends Clock {

		private Instant now = Instant.parse("2026-11-01T00:00:00Z");

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}
	}
}
