package com.tu.clubhub.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Framework/error serialization tests, not database authorization tests. Filters remain enabled. */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
@Import(ApiProblemDetailsIntegrationTest.Probe.class)
class ApiProblemDetailsIntegrationTest {
    @Autowired MockMvc mvc;
    static final String BASE = "/api/v1/task80";
    static final String SECRET = "SECRET_SENTINEL SELECT password FROM private_table java.sql.Exception /private/key";

    @ParameterizedTest
    @ValueSource(ints = {400, 401, 403, 404, 409, 500})
    void responseStatusExceptionsUseSafeProblemDetails(int status) throws Exception {
        assertProblem(mvc.perform(get(BASE + "/status/" + status).with(user("framework-probe"))
                .queryParam("token", "SECRET_QUERY").accept(MediaType.TEXT_HTML)), status, BASE + "/status/" + status);
    }

    @Test void unexpectedExceptionIsSanitized() throws Exception {
        assertProblem(mvc.perform(get(BASE + "/boom").with(user("framework-probe"))), 500, BASE + "/boom")
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    @Test void unsupportedMethodPreservesAllow() throws Exception {
        assertProblem(mvc.perform(delete(BASE + "/body").with(user("framework-probe")).with(csrf())), 405, BASE + "/body")
                .andExpect(header().string("Allow", containsString("POST")))
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test void unsupportedMediaTypePreservesSupportedTypes() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(user("framework-probe")).with(csrf())
                .contentType(MediaType.TEXT_PLAIN).content("SECRET_BODY")), 415, BASE + "/body")
                .andExpect(header().exists("Accept"));
    }

    @Test void malformedJsonDoesNotReflectRejectedBody() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(user("framework-probe")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{SECRET_BODY")), 400, BASE + "/body")
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test void beanValidationKeepsFieldNamesWithoutRejectedValues() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(user("framework-probe")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}")), 400, BASE + "/body")
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    @ParameterizedTest @ValueSource(strings = {"abc", "-1"})
    void pathConversionAndValidationUse400(String id) throws Exception {
        assertProblem(mvc.perform(get(BASE + "/number/" + id).with(user("framework-probe"))), 400, BASE + "/number/" + id)
                .andExpect(jsonPath("$.code").value("INVALID_RESOURCE_ID"));
    }

    @Test void unmatchedApiPathUsesProblemDetails() throws Exception {
        assertProblem(mvc.perform(get(BASE + "/missing").with(user("framework-probe"))), 404, BASE + "/missing");
    }

    @Test void anonymousProtectedRequestUsesAuthenticationProblem() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"valid\"}")), 401, BASE + "/body")
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test void missingCsrfRemainsCsrfFailure() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(user("framework-probe"))), 403, BASE + "/body")
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test void invalidCsrfRemainsCsrfFailure() throws Exception {
        assertProblem(mvc.perform(post(BASE + "/body").with(user("framework-probe")).with(csrf().useInvalidToken())),
                403, BASE + "/body").andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    private ResultActions assertProblem(ResultActions result, int status, String path) throws Exception {
        return result.andExpect(status().is(status))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.type").isNotEmpty()).andExpect(jsonPath("$.title").isNotEmpty())
                .andExpect(jsonPath("$.status").value(status)).andExpect(jsonPath("$.detail").isNotEmpty())
                .andExpect(jsonPath("$.instance").value(path)).andExpect(jsonPath("$.code").isNotEmpty())
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(content().string(not(containsString("SECRET"))))
                .andExpect(content().string(not(containsString("java.sql"))))
                .andExpect(content().string(not(containsString("private_table"))))
                .andExpect(jsonPath("$.exception").doesNotExist()).andExpect(jsonPath("$.trace").doesNotExist());
    }

    @RestController @RequestMapping(BASE)
    static class Probe {
        @GetMapping("/status/{status}") void status(@PathVariable int status) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(status), SECRET);
        }
        @GetMapping("/boom") void boom() { throw new IllegalStateException(SECRET); }
        @PostMapping(value = "/body", consumes = MediaType.APPLICATION_JSON_VALUE)
        void body(@Valid @RequestBody Input input) {}
        @GetMapping("/number/{id}") long number(@PathVariable @Positive Long id) { return id; }
    }
    record Input(@NotBlank String name) {}
}
