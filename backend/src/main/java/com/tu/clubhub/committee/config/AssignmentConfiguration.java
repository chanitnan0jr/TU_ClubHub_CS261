package com.tu.clubhub.committee.config;

import com.tu.clubhub.common.config.LockTimeouts;
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
            LockTimeouts.validate(lockTimeout, "Assignment");
        }
        public String databaseLockTimeout() { return LockTimeouts.databaseMillis(lockTimeout); }
    }
}
