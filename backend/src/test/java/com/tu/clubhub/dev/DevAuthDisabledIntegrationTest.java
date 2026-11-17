package com.tu.clubhub.dev;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DevAuthDisabledIntegrationTest {

	@Autowired private MockMvc mockMvc;
	@Autowired private ObjectMapper objectMapper;

	@Test
	void devAuthEndpointsReturn404WhenDevFlagIsDisabled() throws Exception {
		mockMvc.perform(get("/api/v1/auth/dev/accounts"))
				.andExpect(status().isNotFound())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

		MvcResult csrfResult = mockMvc.perform(get("/api/v1/auth/csrf"))
				.andExpect(status().isOk())
				.andReturn();
		Cookie cookie = csrfResult.getResponse().getCookie("SESSION");
		CsrfTokenResponse csrf = objectMapper.readValue(
				csrfResult.getResponse().getContentAsString(), CsrfTokenResponse.class);

		mockMvc.perform(post("/api/v1/auth/dev/switch")
				.cookie(cookie)
				.header(csrf.headerName(), csrf.token())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"role\":\"ADMIN\"}"))
				.andExpect(status().isNotFound())
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
	}
}
