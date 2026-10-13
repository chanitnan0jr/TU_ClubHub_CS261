package com.tu.clubhub.auth.integration.tu;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

class RealTuAuthClientTest {

	private static final URI ENDPOINT = URI.create("https://tu.example.test/authentication");
	private static final String APPLICATION_KEY = "test-application-key";

	@Test
	void sendsDocumentedApplicationKeyAndCredentialFields() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andExpect(method(HttpMethod.POST))
				.andExpect(header("Application-Key", APPLICATION_KEY))
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(content().json("""
						{"UserName":"student-123","PassWord":"example-password"}
						"""))
				.andRespond(withSuccess("""
						{"status":true,"message":"Success","displayname_th":"ชื่อ นามสกุล",
						"displayname_en":"Student Example","email":"student@dome.tu.ac.th",
						"type":"student","department":"Computer Science","faculty":"Science"}
						""", MediaType.APPLICATION_JSON));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);
		var result = client.authenticate("student-123", "example-password");

		assertTrue(result.isPresent());
		assertEquals("ชื่อ นามสกุล", result.orElseThrow().displayName(), "Thai name takes precedence over English");
		assertEquals("student@dome.tu.ac.th", result.orElseThrow().email());
		assertEquals("student", result.orElseThrow().accountType());
		assertEquals("Science", result.orElseThrow().faculty());
		server.verify();
	}

	@Test
	void returnsEmptyForDocumentedBadRequestInvalidCredentials() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andRespond(withBadRequest().body("""
						{"status":false,"message":"User or Password Invalid!"}
						""").contentType(MediaType.APPLICATION_JSON));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);

		assertTrue(client.authenticate("student-123", "wrong-password").isEmpty());
		server.verify();
	}

	@Test
	void distinguishesMalformedBadRequestFromInvalidCredentials() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andRespond(withBadRequest().body("""
						{"status":false,"message":"Could not read the request body!"}
						""").contentType(MediaType.APPLICATION_JSON));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);

		assertThrows(TuAuthRequestRejectedException.class,
				() -> client.authenticate("student-123", "example-password"));
		server.verify();
	}

	@Test
	void fallsBackToEnglishThenUsernameWhenThaiNameIsMissing() {
		assertDisplayName("\"displayname_en\":\"English name\"", "English name");
		assertDisplayName("", "student-123");
	}

	@Test
	void returnsEmptyWhenTheApiRejectsCredentials() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andRespond(withSuccess("""
						{"status":false,"message":"Authorization Failed"}
						""", MediaType.APPLICATION_JSON));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);

		assertTrue(client.authenticate("student-123", "wrong-password").isEmpty());
		server.verify();
	}

	@Test
	void reportsProviderErrorsWithoutExposingUpstreamBodies() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andRespond(withUnauthorizedRequest().body("upstream response with sensitive details"));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);
		TuAuthProviderUnavailableException exception = assertThrows(
				TuAuthProviderUnavailableException.class,
				() -> client.authenticate("student-123", "example-password"));

		assertFalse(exception.getMessage().contains("sensitive details"));
		server.verify();
	}

	private void assertDisplayName(String names, String expected) {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo(ENDPOINT))
				.andRespond(withSuccess("{\"status\":true,\"message\":\"Success\",\"type\":\"student\""
						+ (names.isBlank() ? "" : "," + names) + "}", MediaType.APPLICATION_JSON));

		RealTuAuthClient client = new RealTuAuthClient(builder.build(), ENDPOINT, APPLICATION_KEY);
		assertEquals(expected, client.authenticate("student-123", "example-password").orElseThrow().displayName());
		server.verify();
	}
}
