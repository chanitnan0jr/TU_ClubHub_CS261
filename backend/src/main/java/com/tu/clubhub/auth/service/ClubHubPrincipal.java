package com.tu.clubhub.auth.service;

import java.io.Serial;
import java.io.Serializable;

public record ClubHubPrincipal(Long userId, String tuUsername, String role) implements Serializable {

	@Serial
	private static final long serialVersionUID = 1L;
}
