package com.tu.clubhub.config;

import static org.junit.jupiter.api.Assertions.*;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.bind.annotation.*;

/** A real servlet ERROR dispatch, including an anonymous request accepting HTML. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(ApiFallbackErrorHttpTest.Probe.class)
class ApiFallbackErrorHttpTest {
    @Value("${local.server.port}") int port;

    @Test void nonApiHtmlErrorKeepsTheExistingPageBehavior() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port
                    + "/assets/task80-missing.png")).header("Accept", "text/html").GET().build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(404, response.statusCode());
            assertTrue(response.headers().firstValue("Content-Type").orElse("").startsWith("text/html"));
            assertFalse(response.body().contains("application/problem+json"));
        }
    }
    @ParameterizedTest @CsvSource({"404,application/json", "404,text/html", "500,application/json", "500,text/html"})
    void servletFallbackNeverReturnsHtmlOrErrorMessage(int status, String accept) throws Exception {
        String path = "/api/v1/public/clubs/_task80_fallback";
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path
                    + "?status=" + status + "&token=SECRET_QUERY")).header("Accept", accept).GET().build(), HttpResponse.BodyHandlers.ofString());
            assertEquals(status, response.statusCode(), response.body());
            assertTrue(response.headers().firstValue("Content-Type").orElse("").startsWith("application/problem+json"));
            assertEquals(status, JsonPath.<Integer>read(response.body(), "$.status"));
            assertEquals(path, JsonPath.read(response.body(), "$.instance"));
            for (String field : new String[]{"type", "title", "detail", "code", "traceId"}) assertFalse(JsonPath.<String>read(response.body(), "$." + field).isBlank());
            assertFalse(response.body().contains("SECRET")); assertFalse(response.body().contains("<html"));
        }
    }
    @RestController static class Probe {
        @GetMapping("/api/v1/public/clubs/_task80_fallback")
        void fail(@RequestParam int status, HttpServletResponse response) throws IOException {
            response.sendError(status, "SECRET SQL password /private/key java.sql.Exception");
        }
    }
}
