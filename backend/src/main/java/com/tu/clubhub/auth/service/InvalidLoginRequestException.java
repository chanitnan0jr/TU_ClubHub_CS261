package com.tu.clubhub.auth.service;

import java.util.List;

public class InvalidLoginRequestException extends RuntimeException {
	private final List<String> fields;

	public InvalidLoginRequestException(List<String> fields) {
		this.fields = List.copyOf(fields);
	}

	public List<String> fields() {
		return fields;
	}
}
