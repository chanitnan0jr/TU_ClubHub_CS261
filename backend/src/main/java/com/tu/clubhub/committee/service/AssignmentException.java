package com.tu.clubhub.committee.service;

import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import java.util.List;

/** Safe domain codes, never raw database messages. */
public final class AssignmentException extends RuntimeException {
    private final int status;
    private final String code, reason;
    private final List<FieldError> fields;
    private AssignmentException(int status, String code, String reason, List<FieldError> fields) {
        super(code); this.status = status; this.code = code; this.reason = reason; this.fields = List.copyOf(fields);
    }
    public int status() { return status; }
    public String code() { return code; }
    public String reason() { return reason; }
    public List<FieldError> fields() { return fields; }
    public static AssignmentException failure(int status, String code) { return new AssignmentException(status, code, null, List.of()); }
    public static AssignmentException conflict(String reason) { return new AssignmentException(409, "RESOURCE_CONFLICT", reason, List.of()); }
    public static AssignmentException invalid(String field, String message) {
        return new AssignmentException(400, "VALIDATION_FAILED", null, List.of(new FieldError(field, "INVALID", message)));
    }
}
