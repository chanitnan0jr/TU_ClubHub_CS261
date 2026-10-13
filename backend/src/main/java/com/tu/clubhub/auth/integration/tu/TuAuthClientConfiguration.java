package com.tu.clubhub.auth.integration.tu;

import java.net.URI;
import java.net.http.HttpClient;
import java.util.Arrays;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(TuAuthProperties.class)
public class TuAuthClientConfiguration {

	@Bean
	TuAuthClient tuAuthClient(TuAuthProperties properties, Environment environment) {
		if (properties.getMode() == TuAuthProperties.Mode.MOCK) {
			String[] activeProfiles = environment.getActiveProfiles();
			boolean localOrTest = Arrays.stream(activeProfiles)
					.anyMatch(profile -> profile.equals("dev") || profile.equals("test"));
			boolean production = Arrays.stream(activeProfiles).anyMatch(profile -> profile.equals("prod"));
			if (!localOrTest || production) {
				throw new IllegalStateException("TU mock authentication is allowed only with the dev or test profile");
			}
			return new MockTuAuthClient();
		}

		String endpointUrl = properties.getEndpointUrl();
		String applicationKey = properties.getApplicationKey();
		if (endpointUrl == null || endpointUrl.isBlank() || applicationKey == null || applicationKey.isBlank()) {
			throw new IllegalStateException(
					"Real TU authentication requires TU_AUTH_ENDPOINT_URL and TU_AUTH_APPLICATION_KEY; "
							+ "the application will not fall back to mock authentication");
		}

		URI endpoint = URI.create(endpointUrl);
		if (!"https".equalsIgnoreCase(endpoint.getScheme())) {
			throw new IllegalStateException("The TU Authentication API endpoint must use HTTPS");
		}
		if (properties.getConnectTimeout() == null || properties.getConnectTimeout().isNegative()
				|| properties.getConnectTimeout().isZero()
				|| properties.getReadTimeout() == null || properties.getReadTimeout().isNegative()
				|| properties.getReadTimeout().isZero()) {
			throw new IllegalStateException("TU Authentication API timeouts must be positive durations");
		}

		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(properties.getConnectTimeout()).build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(properties.getReadTimeout());
		RestClient restClient = RestClient.builder().requestFactory(requestFactory).build();
		return new RealTuAuthClient(restClient, endpoint, applicationKey);
	}
}
