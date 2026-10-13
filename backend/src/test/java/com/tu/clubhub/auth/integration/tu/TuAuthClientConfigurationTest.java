package com.tu.clubhub.auth.integration.tu;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class TuAuthClientConfigurationTest {

	private final TuAuthClientConfiguration configuration = new TuAuthClientConfiguration();

	@Test
	void selectsMockForTheTestProfile() {
		TuAuthProperties properties = new TuAuthProperties();
		properties.setMode(TuAuthProperties.Mode.MOCK);
		MockEnvironment environment = new MockEnvironment();
		environment.setActiveProfiles("test");

		assertInstanceOf(MockTuAuthClient.class, configuration.tuAuthClient(properties, environment));
	}

	@Test
	void refusesMockOutsideDevOrTest() {
		TuAuthProperties properties = new TuAuthProperties();
		properties.setMode(TuAuthProperties.Mode.MOCK);
		MockEnvironment environment = new MockEnvironment();
		environment.setActiveProfiles("prod");

		assertThrows(IllegalStateException.class, () -> configuration.tuAuthClient(properties, environment));
	}

	@Test
	void refusesRealModeWhenEndpointOrApplicationKeyIsMissing() {
		TuAuthProperties properties = new TuAuthProperties();
		properties.setMode(TuAuthProperties.Mode.REAL);

		assertThrows(IllegalStateException.class,
				() -> configuration.tuAuthClient(properties, new MockEnvironment()));
	}

	@Test
	void createsRealClientWhenHttpsEndpointAndApplicationKeyAreConfigured() {
		TuAuthProperties properties = new TuAuthProperties();
		properties.setMode(TuAuthProperties.Mode.REAL);
		properties.setEndpointUrl("https://tu.example.test/authentication");
		properties.setApplicationKey("test-application-key");

		assertInstanceOf(RealTuAuthClient.class, configuration.tuAuthClient(properties, new MockEnvironment()));
	}
}
