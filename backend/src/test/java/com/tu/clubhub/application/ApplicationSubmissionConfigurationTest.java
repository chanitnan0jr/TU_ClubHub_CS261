package com.tu.clubhub.application;

import com.tu.clubhub.application.config.ApplicationSubmissionConfiguration;
import com.tu.clubhub.application.config.ApplicationSubmissionProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.junit.jupiter.api.Assertions.*;

class ApplicationSubmissionConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(ApplicationSubmissionConfiguration.class);

    @Test
    void defaultsToTwoSecondsWithoutDependingOnTestDatasourceSettings() {
        runner.run(context -> {
            assertNull(context.getStartupFailure());
            var properties = context.getBean(ApplicationSubmissionProperties.class);
            assertEquals(Duration.ofSeconds(2), properties.lockTimeout());
            assertEquals("2000ms", properties.databaseLockTimeout());
        });
    }

    @Test
    void bindsAConfigurablePositiveWait() {
        runner.withPropertyValues("clubhub.application.submission.lock-timeout=250ms").run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals("250ms", context.getBean(ApplicationSubmissionProperties.class).databaseLockTimeout());
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"0ms", "-1ms", "1ns", "2147483648ms", "invalid"})
    void rejectsDisabledInvalidOrOutOfRangeTimeoutsAtStartup(String value) {
        runner.withPropertyValues("clubhub.application.submission.lock-timeout=" + value)
                .run(context -> assertNotNull(context.getStartupFailure()));
    }

    @Test
    void rejectsNullWithoutOverflowingOnVeryLargeDurations() {
        assertThrows(IllegalArgumentException.class, () -> new ApplicationSubmissionProperties(null));
        assertThrows(IllegalArgumentException.class,
                () -> new ApplicationSubmissionProperties(Duration.ofSeconds(Long.MAX_VALUE)));
    }

    @Test
    void acceptsPostgresMillisecondBounds() {
        assertEquals("1ms", new ApplicationSubmissionProperties(Duration.ofMillis(1)).databaseLockTimeout());
        assertEquals("2147483647ms", new ApplicationSubmissionProperties(Duration.ofMillis(Integer.MAX_VALUE)).databaseLockTimeout());
    }
}
