package com.tu.clubhub.config;

import java.util.List;

import com.tu.clubhub.auth.dto.ProblemResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import tools.jackson.databind.ObjectMapper;

@Configuration(proxyBeanMethods = false)
public class SecurityConfiguration {

	@Bean
	SecurityContextRepository securityContextRepository() {
		HttpSessionSecurityContextRepository repository = new HttpSessionSecurityContextRepository();
		repository.setDisableUrlRewriting(true);
		return repository;
	}

	@Bean
	CsrfTokenRepository csrfTokenRepository() {
		HttpSessionCsrfTokenRepository repository = new HttpSessionCsrfTokenRepository();
		repository.setHeaderName("X-CSRF-TOKEN");
		return repository;
	}

	@Bean
	CsrfTokenRequestHandler csrfTokenRequestHandler() {
		return new XorCsrfTokenRequestAttributeHandler();
	}

	@Bean
	SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrfTokenRepository) {
		return new CompositeSessionAuthenticationStrategy(List.of(
				new ChangeSessionIdAuthenticationStrategy(),
				new CsrfAuthenticationStrategy(csrfTokenRepository)));
	}

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			SecurityContextRepository securityContextRepository,
			CsrfTokenRepository csrfTokenRepository,
			CsrfTokenRequestHandler csrfTokenRequestHandler,
			ObjectMapper objectMapper) throws Exception {
		http
				.securityContext(context -> context
						.securityContextRepository(securityContextRepository)
						.requireExplicitSave(true))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
				.csrf(csrf -> csrf
						.csrfTokenRepository(csrfTokenRepository)
						.csrfTokenRequestHandler(csrfTokenRequestHandler))
				.addFilterAfter(new AbsoluteSessionTimeoutFilter(objectMapper), SecurityContextHolderFilter.class)
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers("/api/v1/auth/csrf", "/api/v1/auth/login").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/v1/clubs/**").permitAll()
						.anyRequest().authenticated())
				.requestCache(cache -> cache.disable())
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
				.logout(logout -> logout.disable())
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint((request, response, exception) -> writeProblem(
								objectMapper, response, request.getRequestURI(), 401,
								"Authentication required", "Sign in to access this resource.", "AUTHENTICATION_REQUIRED"))
						.accessDeniedHandler((request, response, exception) -> {
							boolean csrfFailure = exception instanceof CsrfException;
							writeProblem(objectMapper, response, request.getRequestURI(), 403,
								csrfFailure ? "Request rejected" : "Access denied",
								csrfFailure ? "The CSRF token is missing or invalid." : "You are not allowed to access this resource.",
								csrfFailure ? "CSRF_INVALID" : "ACCESS_DENIED");
						}));
		return http.build();
	}

	static void writeProblem(
			ObjectMapper objectMapper,
			HttpServletResponse response,
			String path,
			int status,
			String title,
			String detail,
			String code) throws java.io.IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setHeader("Cache-Control", "no-store");
		objectMapper.writeValue(response.getOutputStream(), new ProblemResponse(
				"urn:tuclubhub:problem:" + code.toLowerCase().replace('_', '-'),
				title,
				status,
				detail,
				path,
				code,
				java.util.UUID.randomUUID().toString(),
				List.of()));
	}
}
