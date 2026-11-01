package com.tu.clubhub.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Caps TU verification attempts per client address and per username, so one client cannot
 * brute-force an account or spend the shared TU Application-Key quota.
 */
// shortcut: in-memory fixed windows per app instance, and behind the split-profile nginx every client
// shares one address; move to a shared store keyed on a trusted client IP before running more instances.
@Component
public class LoginRateLimiter {

	private static final int PURGE_THRESHOLD = 10_000;

	private record Window(Instant end, int count) {
	}

	private final Clock clock;
	private final int attemptsPerClient;
	private final Duration clientWindow;
	private final int attemptsPerUsername;
	private final Duration usernameWindow;
	private final Map<String, Window> clients = new ConcurrentHashMap<>();
	private final Map<String, Window> usernames = new ConcurrentHashMap<>();

	public LoginRateLimiter(
			Clock clock,
			@Value("${clubhub.auth.login-limit.attempts-per-client:50}") int attemptsPerClient,
			@Value("${clubhub.auth.login-limit.client-window:10m}") Duration clientWindow,
			@Value("${clubhub.auth.login-limit.attempts-per-username:5}") int attemptsPerUsername,
			@Value("${clubhub.auth.login-limit.username-window:15m}") Duration usernameWindow) {
		if (attemptsPerClient < 1 || attemptsPerUsername < 1
				|| !clientWindow.isPositive() || !usernameWindow.isPositive()) {
			throw new IllegalArgumentException("Login attempt limits and windows must be positive");
		}
		this.clock = clock;
		this.attemptsPerClient = attemptsPerClient;
		this.clientWindow = clientWindow;
		this.attemptsPerUsername = attemptsPerUsername;
		this.usernameWindow = usernameWindow;
	}

	/** Counts one attempt; throws {@link LoginRateLimitedException} when the client or username is over its limit. */
	public void acquire(String clientAddress, String username) {
		Instant now = clock.instant();
		if (clients.size() + usernames.size() > PURGE_THRESHOLD) {
			clients.values().removeIf(window -> !now.isBefore(window.end()));
			usernames.values().removeIf(window -> !now.isBefore(window.end()));
		}
		count(clients, clientAddress, clientWindow, attemptsPerClient, now);
		count(usernames, usernameKey(username), usernameWindow, attemptsPerUsername, now);
	}

	/** Verified credentials clear that username's attempts; the client's count stays. */
	public void recordSuccess(String username) {
		usernames.remove(usernameKey(username));
	}

	private static void count(Map<String, Window> windows, String key, Duration length, int limit, Instant now) {
		Window window = windows.compute(key, (ignored, current) -> current == null || !now.isBefore(current.end())
				? new Window(now.plus(length), 1)
				: new Window(current.end(), current.count() + 1));
		if (window.count() > limit) {
			long millis = Duration.between(now, window.end()).toMillis();
			throw new LoginRateLimitedException(Math.max(1, (millis + 999) / 1000));
		}
	}

	private static String usernameKey(String username) {
		return username.strip().toLowerCase(Locale.ROOT);
	}
}
