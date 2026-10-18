package com.tu.clubhub.club.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.CannotCreateTransactionException;

import com.tu.clubhub.club.dto.PublicClubProfileDto;
import com.tu.clubhub.club.dto.PublicRecruitmentRoundPageDto;
import com.tu.clubhub.club.service.PublicClubService;

/** Fault injection verifies error dispatch through the real HTTP server and security filters. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(PublicClubErrorHandlingIntegrationTest.FailureConfiguration.class)
class PublicClubErrorHandlingIntegrationTest {
    @Value("${local.server.port}")
    private int port;

    @ParameterizedTest
    @ValueSource(strings = {"", "/recruitment-rounds"})
    void databaseQueryFailureUsesServiceUnavailableProblem(String suffix) throws Exception {
        assertProblem("1", suffix, 503, "SERVICE_UNAVAILABLE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/recruitment-rounds"})
    void transactionCreationFailureUsesServiceUnavailableProblem(String suffix) throws Exception {
        assertProblem("2", suffix, 503, "SERVICE_UNAVAILABLE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/recruitment-rounds"})
    void unexpectedFailureUsesInternalErrorProblem(String suffix) throws Exception {
        assertProblem("3", suffix, 500, "INTERNAL_ERROR");
    }

    private void assertProblem(String id, String suffix, int status, String code) throws Exception {
        String path = "/api/v1/public/clubs/" + id + suffix;
        try (HttpClient client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create(
                    "http://127.0.0.1:" + port + path)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(status, response.statusCode(), response.body());
            assertEquals("application/problem+json", response.headers().firstValue("Content-Type").orElse(""));
            assertEquals(status, JsonPath.<Integer>read(response.body(), "$.status"));
            assertEquals(code, JsonPath.<String>read(response.body(), "$.code"));
            assertEquals(path, JsonPath.<String>read(response.body(), "$.instance"));
            assertFalse(JsonPath.<String>read(response.body(), "$.traceId").isBlank());
            assertFalse(response.body().contains("QA simulated"), "Internal exception messages must stay private");
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FailureConfiguration {
        @Bean
        @Primary
        PublicClubService failureService() { return new FailingService(); }
    }

    public static class FailingService extends PublicClubService {
        public FailingService() { super(null, null, null); }
        @Override public PublicClubProfileDto getClubProfile(String id) { fail(id); return null; }
        @Override public PublicRecruitmentRoundPageDto getOpenRecruitmentRounds(String id, int page, int size) {
            fail(id); return null;
        }
        private static void fail(String id) {
            switch (id) {
                case "1" -> throw new DataAccessResourceFailureException("QA simulated database failure");
                case "2" -> throw new CannotCreateTransactionException("QA simulated transaction failure");
                default -> throw new IllegalStateException("QA simulated unexpected failure");
            }
        }
    }
}
