package com.tu.clubhub.auth.config;

import java.util.Arrays;

import com.tu.clubhub.auth.integration.tu.TuAuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/**
 * Gates the dev mock role switcher behind {@code clubhub.dev=true}, {@code tu.auth.mode=mock},
 * and a non-production ({@code dev} or {@code test}) Spring profile.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(DevAuthProperties.class)
public class DevAuthAvailability {

	private final boolean enabled;

	public DevAuthAvailability(
			DevAuthProperties devProperties,
			TuAuthProperties tuAuthProperties,
			Environment environment) {
		String[] activeProfiles = environment.getActiveProfiles();
		boolean production = Arrays.stream(activeProfiles).anyMatch("prod"::equals);
		boolean localOrTest = Arrays.stream(activeProfiles)
				.anyMatch(profile -> "dev".equals(profile) || "test".equals(profile));

		if (devProperties.isDev() && production) {
			throw new IllegalStateException("Dev role switcher is forbidden when the prod profile is active");
		}
		this.enabled = devProperties.isDev()
				&& tuAuthProperties.getMode() == TuAuthProperties.Mode.MOCK
				&& localOrTest
				&& !production;
	}

	public boolean isEnabled() {
		return enabled;
	}
}
