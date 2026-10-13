package com.tu.clubhub.auth.dto;

import java.io.Serializable;
import java.util.List;

public record UserResponse(
    Long id,
    String studentId,
    String name,
    List<String> roles
) implements Serializable {

    public UserResponse {
        roles = List.copyOf(roles);
    }
}