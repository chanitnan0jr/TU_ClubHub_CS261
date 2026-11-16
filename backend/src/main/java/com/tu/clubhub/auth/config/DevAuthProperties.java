package com.tu.clubhub.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "clubhub")
public class DevAuthProperties {

	/** Enables the dev mock role switcher only when paired with TU_AUTH_MODE=mock and dev/test profile. */
	private boolean dev = false;

	public boolean isDev() {
		return dev;
	}

	public void setDev(boolean dev) {
		this.dev = dev;
	}
}
