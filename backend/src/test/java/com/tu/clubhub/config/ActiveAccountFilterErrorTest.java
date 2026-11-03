package com.tu.clubhub.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.user.repository.UserAccountRepository;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Fault injection only. Database RBAC is separately verified without mocks. */
@SpringBootTest @AutoConfigureMockMvc(addFilters = true) @ActiveProfiles("test")
class ActiveAccountFilterErrorTest {
    @Autowired MockMvc mvc;
    @MockitoBean UserAccountRepository accounts;

    @ParameterizedTest @ValueSource(booleans = {true, false})
    void accountLookupFailureBeforeControllerUsesSafeProblem(boolean databaseFailure) throws Exception {
        String secret = "SECRET SELECT password FROM private_table /private/key java.sql.Exception";
        when(accounts.findAccountStatusById(123L)).thenThrow(databaseFailure
                ? new DataAccessResourceFailureException(secret) : new IllegalStateException(secret));
        var auth = UsernamePasswordAuthenticationToken.authenticated(new ClubHubPrincipal(123L, "fictional", "USER"), null, List.of());
        mvc.perform(get("/api/v1/auth/me").with(authentication(auth)).queryParam("token", "SECRET"))
                .andExpect(status().is(databaseFailure ? 503 : 500))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(databaseFailure ? 503 : 500))
                .andExpect(jsonPath("$.code").value(databaseFailure ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR"))
                .andExpect(jsonPath("$.type").isNotEmpty()).andExpect(jsonPath("$.title").isNotEmpty())
                .andExpect(jsonPath("$.detail").isNotEmpty()).andExpect(jsonPath("$.instance").value("/api/v1/auth/me"))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(content().string(not(containsString("SECRET"))))
                .andExpect(content().string(not(containsString("private_table"))));
    }
}
