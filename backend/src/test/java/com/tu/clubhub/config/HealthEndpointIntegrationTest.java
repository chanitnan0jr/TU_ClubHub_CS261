package com.tu.clubhub.config;

import static org.hamcrest.Matchers.containsString;
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

@SpringBootTest(properties = {
        "DEPLOY_COMMIT=0123456789abcdef0123456789abcdef01234567",
        "DEPLOY_IMAGE_DIGEST=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
})
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
	void infoIsPublicAndExposesOnlyTheDeploymentIdentifiers() throws Exception {
		mockMvc.perform(get("/actuator/info"))
				.andExpect(status().isOk())
				.andExpect(content().json("{\"commit\":\"0123456789abcdef0123456789abcdef01234567\",\"imageDigest\":\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}", JsonCompareMode.STRICT))
				.andExpect(header().string("Cache-Control", containsString("no-store")))
				.andExpect(header().doesNotExist("Set-Cookie"));
	}

	@Test
	@WithMockUser
	void otherActuatorEndpointsAreNotExposed() throws Exception {
		mockMvc.perform(get("/actuator/env"))
				.andExpect(status().isNotFound());
	}
}
