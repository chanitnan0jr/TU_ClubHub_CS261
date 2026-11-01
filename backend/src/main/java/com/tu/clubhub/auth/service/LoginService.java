package com.tu.clubhub.auth.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.tu.clubhub.auth.integration.tu.TuAuthClient;
import com.tu.clubhub.auth.integration.tu.TuAuthUser;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.service.UserAccountService;
import com.tu.clubhub.user.service.UserAccountService.StudentIdentity;

@Service
public class LoginService {

	private final TuAuthClient tuAuthClient;
	private final UserAccountService userAccountService;
	private final LoginRateLimiter rateLimiter;

	public LoginService(TuAuthClient tuAuthClient, UserAccountService userAccountService,
			LoginRateLimiter rateLimiter) {
		this.tuAuthClient = tuAuthClient;
		this.userAccountService = userAccountService;
		this.rateLimiter = rateLimiter;
	}

	public UserAccount login(String username, String password, String clientAddress) {
		List<String> invalidFields = new ArrayList<>();
		if (username == null || username.isBlank() || username.length() > 100) {
			invalidFields.add("username");
		}
		if (password == null || password.isBlank()) {
			invalidFields.add("password");
		}
		if (!invalidFields.isEmpty()) {
			throw new InvalidLoginRequestException(invalidFields);
		}

		rateLimiter.acquire(clientAddress, username);
		TuAuthUser identity = tuAuthClient.authenticate(username, password)
				.orElseThrow(AuthenticationFailedException::new);
		if (!username.equals(identity.username())) {
			throw new AuthenticationFailedException();
		}
		rateLimiter.recordSuccess(username);

		StudentIdentity student = identity.isStudent()
				? new StudentIdentity(identity.username(), identity.faculty(), identity.department(), identity.studentStatus())
				: null;
		UserAccount account = userAccountService.provisionAfterVerifiedLogin(
				identity.username(), identity.displayName(), identity.email(), student);
		if (!"ACTIVE".equals(account.getAccountStatus())) {
			throw new AccountNotAllowedException();
		}
		return account;
	}
}
