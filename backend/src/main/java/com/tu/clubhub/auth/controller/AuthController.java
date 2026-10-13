package com.tu.clubhub.auth.controller;

import com.tu.clubhub.auth.service.AuthService;
import com.tu.clubhub.auth.dto.LoginRequest;
import com.tu.clubhub.auth.dto.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrf;
    public AuthController(AuthService service, SecurityContextRepository contexts,
                          CsrfTokenRepository csrf) {
        this.service = service; this.contexts = contexts; this.csrf = csrf;
    }
    // Extra endpoint to obtain a CSRF token before POST requests.
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }
    public record CsrfResponse(String headerName, String token) {}
    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest body,
                              HttpServletRequest request, HttpServletResponse response) {
        UserResponse user = service.login(body.username(), body.password());
        var authorities = user.roles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
            user.id(), null, authorities);
        new ChangeSessionIdAuthenticationStrategy()
            .onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        csrf.saveToken(null, request, response);
        return user;
    }
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return service.currentUser(id);
    }
    // POST /logout is implemented by Spring Security's logout filter.
}
