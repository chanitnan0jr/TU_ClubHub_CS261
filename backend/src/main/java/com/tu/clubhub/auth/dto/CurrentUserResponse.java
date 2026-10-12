package com.tu.clubhub.auth.dto;

public record CurrentUserResponse(UserSummary user) {

	public record UserSummary(String id, String role) {
	}
}
