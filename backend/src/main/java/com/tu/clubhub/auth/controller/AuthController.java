package com.tu.clubhub.auth.controller;

import java.util.List;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.auth.dto.CurrentUserResponse;
import com.tu.clubhub.auth.dto.LoginResponse;
import com.tu.clubhub.auth.dto.LoginRequest;
import com.tu.clubhub.auth.dto.ProblemResponse;
import com.tu.clubhub.auth.integration.tu.TuAuthProviderUnavailableException;
import com.tu.clubhub.auth.integration.tu.TuAuthRequestRejectedException;
import com.tu.clubhub.auth.service.AccountNotAllowedException;
import com.tu.clubhub.auth.service.AuthenticationFailedException;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.auth.service.InvalidLoginRequestException;
import com.tu.clubhub.auth.service.LoginService;
import com.tu.clubhub.config.AbsoluteSessionTimeoutFilter;
import com.tu.clubhub.user.domain.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	private final LoginService loginService;
	private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
	private final SecurityContextRepository securityContextRepository;
	private final CsrfTokenRepository csrfTokenRepository;
	private final CsrfTokenRequestHandler csrfTokenRequestHandler;

	public AuthController(
			LoginService loginService,
			SessionAuthenticationStrategy sessionAuthenticationStrategy,
			SecurityContextRepository securityContextRepository,
			CsrfTokenRepository csrfTokenRepository,
			CsrfTokenRequestHandler csrfTokenRequestHandler) {
		this.loginService = loginService;
		this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
		this.securityContextRepository = securityContextRepository;
		this.csrfTokenRepository = csrfTokenRepository;
		this.csrfTokenRequestHandler = csrfTokenRequestHandler;
	}

	@GetMapping("/csrf")
	public ResponseEntity<CsrfTokenResponse> csrf(
			@RequestAttribute("_csrf") CsrfToken csrfToken) {
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new CsrfTokenResponse("X-CSRF-TOKEN", csrfToken.getToken()));
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(
			@RequestBody(required = false) LoginRequest request,
			HttpServletRequest servletRequest,
			HttpServletResponse servletResponse) {
		if (request == null) {
			throw new InvalidLoginRequestException(List.of("username", "password"));
		}

		UserAccount account = loginService.login(request.username(), request.password());
		ClubHubPrincipal principal = new ClubHubPrincipal(
				account.getId(), account.getTuUsername(), account.getSystemRole());
		Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
				principal,
				null,
				List.of(new SimpleGrantedAuthority("ROLE_" + account.getSystemRole())));

		// Rotate the pre-authentication session ID and invalidate its old CSRF token.
		sessionAuthenticationStrategy.onAuthentication(authentication, servletRequest, servletResponse);
		CsrfToken freshCsrfToken = csrfTokenRepository.generateToken(servletRequest);
		csrfTokenRepository.saveToken(freshCsrfToken, servletRequest, servletResponse);
		csrfTokenRequestHandler.handle(servletRequest, servletResponse, () -> freshCsrfToken);
		CsrfToken responseCsrfToken = (CsrfToken) servletRequest.getAttribute("_csrf");
		servletRequest.getSession(true).setAttribute(
				AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE, System.currentTimeMillis());
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, servletRequest, servletResponse);

		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new LoginResponse(toSummary(account),
						new CsrfTokenResponse(responseCsrfToken.getHeaderName(), responseCsrfToken.getToken())));
	}

	@GetMapping("/me")
	public ResponseEntity<CurrentUserResponse> me(Authentication authentication) {
		ClubHubPrincipal principal = (ClubHubPrincipal) authentication.getPrincipal();
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new CurrentUserResponse(
						new CurrentUserResponse.UserSummary(
								principal.userId().toString(), principal.role())));
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpServletRequest request) {
		SecurityContextHolder.clearContext();
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
	}

	private static CurrentUserResponse.UserSummary toSummary(UserAccount account) {
		return new CurrentUserResponse.UserSummary(account.getId().toString(), account.getSystemRole());
	}
}

@RestControllerAdvice(assignableTypes = AuthController.class)
class AuthExceptionHandler {

	@ExceptionHandler(AuthenticationFailedException.class)
	ResponseEntity<ProblemResponse> authenticationFailed(HttpServletRequest request) {
		return problem(request, 401, "Authentication failed",
				"The supplied credentials could not be verified.", "AUTHENTICATION_FAILED", List.of());
	}

	@ExceptionHandler(AccountNotAllowedException.class)
	ResponseEntity<ProblemResponse> accountNotAllowed(HttpServletRequest request) {
		return problem(request, 403, "Account not allowed",
				"This account is not allowed to use TU-ClubHub.", "ACCOUNT_NOT_ALLOWED", List.of());
	}

	@ExceptionHandler(TuAuthProviderUnavailableException.class)
	ResponseEntity<ProblemResponse> providerUnavailable(HttpServletRequest request) {
		return problem(request, 503, "Authentication provider unavailable",
				"Authentication is temporarily unavailable.", "AUTH_PROVIDER_UNAVAILABLE", List.of());
	}

	@ExceptionHandler(TuAuthRequestRejectedException.class)
	ResponseEntity<ProblemResponse> malformedUpstreamRequest(HttpServletRequest request) {
		return problem(request, 500, "Internal server error",
				"The request could not be completed.", "INTERNAL_ERROR", List.of());
	}

	@ExceptionHandler(InvalidLoginRequestException.class)
	ResponseEntity<ProblemResponse> invalidLogin(HttpServletRequest request, InvalidLoginRequestException exception) {
		List<ProblemResponse.FieldError> errors = exception.fields().stream()
				.map(field -> new ProblemResponse.FieldError(field, "REQUIRED", field + " is required or invalid."))
				.toList();
		return problem(request, 400, "Request validation failed",
				"One or more request fields are invalid.", "VALIDATION_FAILED", errors);
	}

	private static ResponseEntity<ProblemResponse> problem(
			HttpServletRequest request,
			int status,
			String title,
			String detail,
			String code,
			List<ProblemResponse.FieldError> fieldErrors) {
		ProblemResponse body = new ProblemResponse(
				"urn:tuclubhub:problem:" + code.toLowerCase().replace('_', '-'),
				title,
				status,
				detail,
				request.getRequestURI(),
				code,
				java.util.UUID.randomUUID().toString(),
				fieldErrors);
		return ResponseEntity.status(HttpStatus.valueOf(status))
				.contentType(org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON)
				.cacheControl(CacheControl.noStore())
				.body(body);
	}
}
