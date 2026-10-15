package com.tu.clubhub.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to forward supported Frontend Single Page Application (SPA) routes
 * to index.html for client-side routing on page refresh or direct URL access.
 * Does NOT use a global catch-all to avoid swallowing 404s for /api/** endpoints or missing assets.
 */
@Controller
public class SpaForwardController {

	@GetMapping(value = {
			"/login",
			"/clubs",
			"/clubs/**",
			"/profile",
			"/dashboard",
			"/dashboard/**"
	})
	public String forwardSpaRoutes() {
		return "forward:/index.html";
	}
}
