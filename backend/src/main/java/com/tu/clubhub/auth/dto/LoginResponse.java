package com.tu.clubhub.auth.dto;

public record LoginResponse(CurrentUserResponse.UserSummary user, CsrfTokenResponse csrf) {
}
