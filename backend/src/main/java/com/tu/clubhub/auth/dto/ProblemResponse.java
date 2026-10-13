package com.tu.clubhub.auth.dto;

import java.util.List;

public record ProblemResponse(
		String type,
		String title,
		int status,
		String detail,
		String instance,
		String code,
		String traceId,
		List<FieldError> fieldErrors) {

	public record FieldError(String field, String code, String message) {
	}
}
