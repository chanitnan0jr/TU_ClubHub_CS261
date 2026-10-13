package com.tu.clubhub.auth.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.tu.clubhub.auth.integration.tu.TuAuthClient;
import com.tu.clubhub.auth.integration.tu.TuAuthUser;
import com.tu.clubhub.user.domain.UserAccount;
import com.tu.clubhub.user.service.UserAccountService;

@Service
public class LoginService {

	private final TuAuthClient tuAuthClient;
	private final UserAccountService userAccountService;

	public LoginService(TuAuthClient tuAuthClient, UserAccountService userAccountService) {
		this.tuAuthClient = tuAuthClient;
		this.userAccountService = userAccountService;
	}

	public UserAccount login(String username, String password) {
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

		TuAuthUser identity = tuAuthClient.authenticate(username, password)
				.orElseThrow(AuthenticationFailedException::new);
		if (!username.equals(identity.username())) {
			throw new AuthenticationFailedException();
		}

		UserAccount account = userAccountService.provisionAfterVerifiedLogin(
				identity.username(), identity.displayName(), identity.email());
		if (!"ACTIVE".equals(account.getAccountStatus())) {
			throw new AccountNotAllowedException();
		}
		return account;
	}
}
