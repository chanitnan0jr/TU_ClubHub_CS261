package com.tu.clubhub.auth.service;

import java.util.List;

import com.tu.clubhub.auth.dto.CsrfTokenResponse;
import com.tu.clubhub.config.AbsoluteSessionTimeoutFilter;
import com.tu.clubhub.user.domain.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.stereotype.Component;

/** Establishes an authenticated Spring Session with session-ID and CSRF rotation. */
@Component
public class AuthSessionEstablisher {

	private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
	private final SecurityContextRepository securityContextRepository;
	private final CsrfTokenRepository csrfTokenRepository;
	private final CsrfTokenRequestHandler csrfTokenRequestHandler;

	public AuthSessionEstablisher(
			SessionAuthenticationStrategy sessionAuthenticationStrategy,
			SecurityContextRepository securityContextRepository,
			CsrfTokenRepository csrfTokenRepository,
			CsrfTokenRequestHandler csrfTokenRequestHandler) {
		this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
		this.securityContextRepository = securityContextRepository;
		this.csrfTokenRepository = csrfTokenRepository;
		this.csrfTokenRequestHandler = csrfTokenRequestHandler;
	}

	public CsrfTokenResponse establish(
			UserAccount account,
			HttpServletRequest servletRequest,
			HttpServletResponse servletResponse) {
		ClubHubPrincipal principal = new ClubHubPrincipal(
				account.getId(), account.getTuUsername(), account.getSystemRole());
		Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
				principal,
				null,
				List.of(new SimpleGrantedAuthority("ROLE_" + account.getSystemRole())));

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

		return new CsrfTokenResponse(responseCsrfToken.getHeaderName(), responseCsrfToken.getToken());
	}
}
