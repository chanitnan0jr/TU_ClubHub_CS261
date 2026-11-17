package com.tu.clubhub.application.config;

import com.tu.clubhub.common.config.LockTimeouts;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** An operational per-lock wait bound, not a request deadline or a business quota. */
@ConfigurationProperties(prefix = "clubhub.application.submission")
public record ApplicationSubmissionProperties(@DefaultValue("2s") Duration lockTimeout) {
    public ApplicationSubmissionProperties {
        LockTimeouts.validate(lockTimeout, "Application submission");
    }

    public String databaseLockTimeout() { return LockTimeouts.databaseMillis(lockTimeout); }
}
