package com.tu.clubhub.dev.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tu.clubhub.auth.integration.tu.TuAuthProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DevAuthAvailabilityTest {

	@Test
	void enabledWhenDevTrueMockModeAndDevOrTestProfile() {
		for (String profile : new String[] { "dev", "test" }) {
			var availability = availability(true, TuAuthProperties.Mode.MOCK, profile);
			assertTrue(availability.isEnabled(), profile);
		}
	}

	@Test
	void disabledWhenDevFlagIsFalseOrModeIsRealOrNoDevProfile() {
		assertFalse(availability(false, TuAuthProperties.Mode.MOCK, "dev").isEnabled());
		assertFalse(availability(true, TuAuthProperties.Mode.REAL, "dev").isEnabled());
		assertFalse(availability(true, TuAuthProperties.Mode.MOCK).isEnabled());
	}

	@Test
	void refusesDevFlagInProdProfile() {
		assertThrows(IllegalStateException.class,
				() -> availability(true, TuAuthProperties.Mode.MOCK, "prod"));
		assertThrows(IllegalStateException.class,
				() -> availability(true, TuAuthProperties.Mode.REAL, "dev", "prod"));
	}

	private static DevAuthAvailability availability(boolean dev, TuAuthProperties.Mode mode, String... profiles) {
		DevAuthProperties devProps = new DevAuthProperties();
		devProps.setDev(dev);
		TuAuthProperties tuProps = new TuAuthProperties();
		tuProps.setMode(mode);
		MockEnvironment env = new MockEnvironment();
		env.setActiveProfiles(profiles);
		return new DevAuthAvailability(devProps, tuProps, env);
	}
}
