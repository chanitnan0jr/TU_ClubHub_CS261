package com.tu.clubhub.application.service;

import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import java.util.List;

/** Service errors carrying the codes/reasons defined by the application contract. */
public final class ApplicationSubmissionException extends RuntimeException {
    private final int status;
    private final String code;
    private final String reason;
    private final List<FieldError> fieldErrors;

    private ApplicationSubmissionException(int status, String code, String reason,
            String detail, List<FieldError> fieldErrors) {
        super(detail);
        this.status = status;
        this.code = code;
        this.reason = reason;
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public int status() { return status; }
    public String code() { return code; }
    public String reason() { return reason; }
    public List<FieldError> fieldErrors() { return fieldErrors; }

    public static ApplicationSubmissionException failure(int status, String code, String detail) {
        return new ApplicationSubmissionException(status, code, null, detail, List.of());
    }

    public static ApplicationSubmissionException conflict(String reason) {
        return new ApplicationSubmissionException(409, "RESOURCE_CONFLICT", reason,
                "The application conflicts with the current state.", List.of());
    }

    public static ApplicationSubmissionException validation(List<FieldError> errors) {
        return new ApplicationSubmissionException(400, "VALIDATION_FAILED", null,
                "One or more request fields are invalid.", errors);
    }
}
