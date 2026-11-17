package com.tu.clubhub.common.config;

import java.time.Duration;

/** Validates and formats PostgreSQL lock_timeout durations bounded to positive 32-bit milliseconds. */
public final class LockTimeouts {
    private LockTimeouts() {}

    public static void validate(Duration lockTimeout, String label) {
        if (lockTimeout == null || lockTimeout.compareTo(Duration.ofMillis(1)) < 0
                || lockTimeout.compareTo(Duration.ofMillis(Integer.MAX_VALUE)) > 0) {
            throw new IllegalArgumentException(label + " lock-timeout must be between 1ms and 2147483647ms");
        }
    }

    public static String databaseMillis(Duration lockTimeout) {
        return lockTimeout.toMillis() + "ms";
    }
}
