package com.tu.clubhub.auth.integration.tu;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
		assertInstanceOf(RealTuAuthClient.class,
				configuration.tuAuthClient(real("https://restapi.tu.ac.th/api/v1/auth/Ad/verify"), new MockEnvironment()));
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"http://restapi.tu.ac.th/api/v1/auth/Ad/verify",
			"https://tu.example.test/api/v1/auth/Ad/verify",
			"https://restapi.tu.ac.th.example.test/api/v1/auth/Ad/verify",
			"https://user@restapi.tu.ac.th/api/v1/auth/Ad/verify",
			"https://restapi.tu.ac.th:8443/api/v1/auth/Ad/verify"})
	void refusesEndpointsThatWouldSendTheApplicationKeyElsewhere(String endpointUrl) {
		assertThrows(IllegalStateException.class,
				() -> configuration.tuAuthClient(real(endpointUrl), new MockEnvironment()));
	}

	private static TuAuthProperties real(String endpointUrl) {
		TuAuthProperties properties = new TuAuthProperties();
		properties.setMode(TuAuthProperties.Mode.REAL);
		properties.setEndpointUrl(endpointUrl);
		properties.setApplicationKey("test-application-key");
		return properties;
	}
}
