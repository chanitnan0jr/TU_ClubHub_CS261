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
import com.tu.clubhub.auth.service.AuthSessionEstablisher;
import com.tu.clubhub.auth.service.AuthenticationFailedException;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.auth.service.CurrentUserService;
import com.tu.clubhub.auth.service.InvalidLoginRequestException;
import com.tu.clubhub.auth.service.LoginRateLimitedException;
import com.tu.clubhub.auth.service.LoginService;
import com.tu.clubhub.user.domain.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
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
	private final CurrentUserService currentUserService;
	private final AuthSessionEstablisher sessionEstablisher;

	public AuthController(
			LoginService loginService,
			CurrentUserService currentUserService,
			AuthSessionEstablisher sessionEstablisher) {
		this.loginService = loginService;
		this.currentUserService = currentUserService;
		this.sessionEstablisher = sessionEstablisher;
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

		UserAccount account = loginService.login(
				request.username(), request.password(), servletRequest.getRemoteAddr());
		CsrfTokenResponse csrf = sessionEstablisher.establish(account, servletRequest, servletResponse);

		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new LoginResponse(toSummary(account), csrf));
	}

	@GetMapping("/me")
	public ResponseEntity<CurrentUserResponse> me(Authentication authentication) {
		ClubHubPrincipal principal = (ClubHubPrincipal) authentication.getPrincipal();
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new CurrentUserResponse(currentUserService.describe(principal.userId())));
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
@org.springframework.core.annotation.Order(0)
class AuthExceptionHandler extends com.tu.clubhub.common.error.ApiExceptionHandler {

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

	@ExceptionHandler(LoginRateLimitedException.class)
	ResponseEntity<ProblemResponse> rateLimited(
			HttpServletRequest request, HttpServletResponse response, LoginRateLimitedException exception) {
		response.setHeader("Retry-After", Long.toString(exception.retryAfterSeconds()));
		return problem(request, 429, "Too many login attempts",
				"Too many login attempts. Try again later.", "RATE_LIMITED", List.of());
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
