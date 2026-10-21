package com.tu.clubhub.application.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** An operational per-lock wait bound, not a request deadline or a business quota. */
@ConfigurationProperties(prefix = "clubhub.application.submission")
public record ApplicationSubmissionProperties(@DefaultValue("2s") Duration lockTimeout) {
    public ApplicationSubmissionProperties {
        if (lockTimeout == null || lockTimeout.compareTo(Duration.ofMillis(1)) < 0
                || lockTimeout.compareTo(Duration.ofMillis(Integer.MAX_VALUE)) > 0) {
            throw new IllegalArgumentException("Application submission lock-timeout must be between 1ms and 2147483647ms");
        }
    }

    public String databaseLockTimeout() { return lockTimeout.toMillis() + "ms"; }
}
