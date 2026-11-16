package com.tu.clubhub.auth.controller;

import java.util.List;

import com.tu.clubhub.auth.dto.CurrentUserResponse;
import com.tu.clubhub.auth.service.AccountNotAllowedException;
import com.tu.clubhub.auth.service.AuthSessionEstablisher;
import com.tu.clubhub.auth.service.CurrentUserService;
import com.tu.clubhub.auth.service.DevAuthService;
import com.tu.clubhub.auth.service.DevAuthService.DevAccountSummary;
import com.tu.clubhub.auth.service.DevMockRole;
import com.tu.clubhub.user.domain.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Local-dev endpoints for listing and switching between the four fixed mock role accounts. */
@RestController
@RequestMapping("/api/v1/auth/dev")
public class DevAuthController {

	public record DevAccountsResponse(List<DevAccountSummary> accounts) {
		public DevAccountsResponse {
			accounts = List.copyOf(accounts);
		}
	}

	public record DevSwitchRequest(@NotNull DevMockRole role) {
	}

	private final DevAuthService devAuthService;
	private final CurrentUserService currentUserService;
	private final AuthSessionEstablisher sessionEstablisher;

	public DevAuthController(
			DevAuthService devAuthService,
			CurrentUserService currentUserService,
			AuthSessionEstablisher sessionEstablisher) {
		this.devAuthService = devAuthService;
		this.currentUserService = currentUserService;
		this.sessionEstablisher = sessionEstablisher;
	}

	@GetMapping(path = "/accounts", produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<DevAccountsResponse> accounts() {
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new DevAccountsResponse(devAuthService.listAccounts()));
	}

	@PostMapping(
			path = "/switch",
			consumes = MediaType.APPLICATION_JSON_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<CurrentUserResponse> switchAccount(
			@Valid @RequestBody DevSwitchRequest request,
			HttpServletRequest servletRequest,
			HttpServletResponse servletResponse) {
		UserAccount account = devAuthService.switchTo(request.role());
		sessionEstablisher.establish(account, servletRequest, servletResponse);
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(new CurrentUserResponse(currentUserService.describe(account.getId())));
	}
}

@RestControllerAdvice(assignableTypes = DevAuthController.class)
@Order(0)
class DevAuthExceptionHandler extends com.tu.clubhub.common.error.ApiExceptionHandler {

	@ExceptionHandler(AccountNotAllowedException.class)
	ResponseEntity<com.tu.clubhub.auth.dto.ProblemResponse> accountNotAllowed(HttpServletRequest request) {
		return problem(request, 403, "ACCOUNT_NOT_ALLOWED",
				"This account is not allowed to use TU-ClubHub.", List.of(), new org.springframework.http.HttpHeaders(), null);
	}
}
