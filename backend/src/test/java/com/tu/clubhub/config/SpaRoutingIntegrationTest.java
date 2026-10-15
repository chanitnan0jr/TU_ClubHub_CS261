package com.tu.clubhub.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SpaRoutingIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void supportedSpaRoutesForwardToIndexHtmlWithoutAuthentication() throws Exception {
		mockMvc.perform(get("/login"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("/index.html"));

		mockMvc.perform(get("/clubs"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("/index.html"));

		mockMvc.perform(get("/clubs/c0a80124-9123-4567-89ab-cdef01234567"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("/index.html"));

		mockMvc.perform(get("/profile"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("/index.html"));

		mockMvc.perform(get("/dashboard"))
				.andExpect(status().isOk())
				.andExpect(forwardedUrl("/index.html"));
	}

	@Test
	void apiEndpointsDoNotForwardToIndexHtml() throws Exception {
		mockMvc.perform(get("/api/v1/non-existent-route"))
				.andExpect(status().is4xxClientError());
	}
}
