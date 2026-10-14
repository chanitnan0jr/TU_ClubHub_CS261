package com.tu.clubhub.auth.integration.tu;

import java.net.URI;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.json.JsonMapper;

/** Real HTTP adapter for the documented TU Authentication request/response format. */
public final class RealTuAuthClient implements TuAuthClient {

	private static final String APPLICATION_KEY_HEADER = "Application-Key";
	private static final JsonMapper ERROR_JSON_MAPPER = JsonMapper.builder().build();

	private final RestClient restClient;
	private final URI endpoint;
	private final String applicationKey;

	public RealTuAuthClient(RestClient restClient, URI endpoint, String applicationKey) {
		this.restClient = restClient;
		this.endpoint = endpoint;
		this.applicationKey = applicationKey;
	}

	@Override
	public Optional<TuAuthUser> authenticate(String username, String password) {
		if (username == null || username.isBlank() || password == null || password.isBlank()) {
			return Optional.empty();
		}

		TuAuthResponse response;
		try {
			response = restClient.post()
					.uri(endpoint)
					.header(APPLICATION_KEY_HEADER, applicationKey)
					.contentType(MediaType.APPLICATION_JSON)
					.body(new TuAuthRequest(username, password))
					.retrieve()
					.body(TuAuthResponse.class);
		} catch (HttpClientErrorException.BadRequest exception) {
			if (isInvalidCredentials(exception.getResponseBodyAsString())) {
				return Optional.empty();
			}
			throw new TuAuthRequestRejectedException();
		} catch (RestClientException exception) {
			// Avoid propagating upstream response bodies or credentials through exception messages.
			throw new TuAuthProviderUnavailableException("TU Authentication API request failed");
		}

		if (response == null || response.status() == null) {
			throw new TuAuthProviderUnavailableException("TU Authentication API returned an unusable response");
		}
		if (!response.status()) {
			return Optional.empty();
		}

		String displayName = firstNonBlank(response.displayNameThai(), response.displayNameEnglish(), username);
		if (response.type() == null || response.type().isBlank()) {
			throw new TuAuthProviderUnavailableException("TU Authentication API returned an incomplete identity");
		}

		return Optional.of(new TuAuthUser(
				username,
				displayName,
				response.email(),
				response.type(),
				response.department(),
				response.faculty()));
	}

	private static boolean isInvalidCredentials(String body) {
		try {
			TuAuthErrorResponse error = ERROR_JSON_MAPPER.readValue(body, TuAuthErrorResponse.class);
			return Boolean.FALSE.equals(error.status()) && "User or Password Invalid!".equals(error.message());
		} catch (Exception ignored) {
			return false;
		}
	}

	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value;
			}
		}
		return values[values.length - 1];
	}

	private record TuAuthRequest(
			@JsonProperty("UserName") String username,
			@JsonProperty("PassWord") String password) {
	}

	private record TuAuthResponse(
			Boolean status,
			String message,
			@JsonProperty("displayname_th") String displayNameThai,
			@JsonProperty("displayname_en") String displayNameEnglish,
			String email,
			String type,
			String department,
			String faculty,
			String organization) {
	}

	private record TuAuthErrorResponse(Boolean status, String message) {
	}
}
