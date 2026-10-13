package com.tu.clubhub.auth.service;

import com.tu.clubhub.auth.dto.UserResponse;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UnconfiguredAuthService implements AuthService {

    @Override
    public UserResponse login(String username, String password) {
        throw unavailable();
    }

    @Override
    public UserResponse currentUser(Long userId) {
        throw unavailable();
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "TU authentication and internal user database are not connected yet"
        );
    }
}