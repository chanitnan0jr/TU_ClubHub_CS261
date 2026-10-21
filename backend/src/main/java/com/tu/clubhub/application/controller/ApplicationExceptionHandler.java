package com.tu.clubhub.application.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.auth.dto.ProblemResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ApplicationController.class)
public class ApplicationExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApplicationExceptionHandler.class);

    /** Reuses the shared error fields and adds only the contract's conflict reason. */
    public record SubmissionProblem(@JsonUnwrapped ProblemResponse problem,
            @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {}

    @ExceptionHandler(ApplicationSubmissionException.class)
    public ResponseEntity<SubmissionProblem> submission(ApplicationSubmissionException exception,
            HttpServletRequest request) {
        if ("ACCOUNT_NOT_ALLOWED".equals(exception.code())) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
        }
        return problem(request, exception.status(), exception.code(), exception.getMessage(),
                exception.reason(), exception.fieldErrors(), exception);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<SubmissionProblem> unreadable(HttpMessageNotReadableException exception,
            HttpServletRequest request) {
        // Strict DTO factories retain indexed field errors inside the JSON conversion exception.
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ApplicationSubmissionException validation) return submission(validation, request);
        }
        return problem(request, 400, "VALIDATION_FAILED", "Provide a valid JSON request body.", null,
                List.of(new ProblemResponse.FieldError("request", "INVALID", "Invalid JSON request body.")), null);
    }

    @ExceptionHandler({DataAccessResourceFailureException.class, CannotCreateTransactionException.class})
    public ResponseEntity<SubmissionProblem> unavailable(Exception exception, HttpServletRequest request) {
        return problem(request, 503, "SERVICE_UNAVAILABLE", "Application submission is temporarily unavailable.",
                null, List.of(), exception);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<SubmissionProblem> unexpected(Exception exception, HttpServletRequest request) throws Exception {
        if (exception instanceof AuthenticationException || exception instanceof AccessDeniedException) throw exception;
        if (exception instanceof ErrorResponse error && error.getStatusCode().value() < 500) {
            int status = error.getStatusCode().value();
            var response = problem(request, status, "HTTP_" + status, "The HTTP request is not supported.",
                    null, List.of(), null);
            return ResponseEntity.status(status).headers(response.getHeaders()).headers(error.getHeaders())
                    .body(response.getBody());
        }
        return problem(request, 500, "INTERNAL_ERROR", "The request could not be completed.",
                null, List.of(), exception);
    }

    private ResponseEntity<SubmissionProblem> problem(HttpServletRequest request, int status, String code,
            String detail, String reason, List<ProblemResponse.FieldError> errors, Exception exception) {
        String traceId = UUID.randomUUID().toString();
        if (status >= 500) LOG.error("Application request failed: traceId={}, path={}", traceId, request.getRequestURI(), exception);
        String suffix = "VALIDATION_FAILED".equals(code) ? "validation-error"
                : code.toLowerCase(Locale.ROOT).replace('_', '-');
        var body = new ProblemResponse("urn:tuclubhub:problem:" + suffix,
                HttpStatus.valueOf(status).getReasonPhrase(), status, detail, request.getRequestURI(), code, traceId, errors);
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore()).body(new SubmissionProblem(body, reason));
    }
}
