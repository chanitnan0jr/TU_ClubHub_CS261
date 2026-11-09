package com.tu.clubhub.dashboard.security;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminAccessService {

    private final JdbcTemplate jdbc;

    public AdminAccessService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long requireAdmin() {
        long userId = currentUserId();

        AccountAccess account = jdbc.query("""
                SELECT account_status, system_role
                FROM users
                WHERE id = ?
                """,
                (rs, rowNum) -> new AccountAccess(
                        rs.getString("account_status"),
                        rs.getString("system_role")),
                userId
        ).stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "A valid account is required"));

        if (!"ACTIVE".equals(account.accountStatus())) {
            throw new AccessDeniedException(
                    "An active account is required");
        }

        if (!"ADMIN".equals(account.systemRole())) {
            throw new AccessDeniedException(
                    "Administrator permission is required");
        }

        return userId;
    }

    private long currentUserId() {
        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal()
                        instanceof ClubHubPrincipal principal)
                || principal.userId() == null
                || principal.userId() <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Sign in to access administrator statistics");
        }

        return principal.userId();
    }

    private record AccountAccess(
            String accountStatus,
            String systemRole) {
    }
}