package com.tu.clubhub.committee.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AssignmentConfiguration.Properties.class)
public class AssignmentConfiguration {
    @ConfigurationProperties("clubhub.committee.assignment")
    public record Properties(@DefaultValue("2s") Duration lockTimeout) {
        public Properties {
            if (lockTimeout == null || lockTimeout.compareTo(Duration.ofMillis(1)) < 0
                    || lockTimeout.compareTo(Duration.ofMillis(Integer.MAX_VALUE)) > 0)
                throw new IllegalArgumentException("Assignment lock-timeout must be between 1ms and 2147483647ms");
        }
        public String databaseLockTimeout() { return lockTimeout.toMillis() + "ms"; }
    }
}
