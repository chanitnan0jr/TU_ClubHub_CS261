package com.tu.clubhub.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthEndpointIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void healthIsPublicAndReturnsOnlyTheStatus() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(content().json("{\"status\":\"UP\"}", JsonCompareMode.STRICT))
				.andExpect(header().doesNotExist("Set-Cookie"));
	}

	@Test
	@WithMockUser
	void otherActuatorEndpointsAreNotExposed() throws Exception {
		mockMvc.perform(get("/actuator/env"))
				.andExpect(status().isNotFound());
	}
}
