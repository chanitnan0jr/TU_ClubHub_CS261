package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.auth.dto.ProblemResponse;
import com.tu.clubhub.common.error.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = {
        ApplicationController.class,
        ClubApplicationController.class,
        MyApplicationController.class
})
@Order(0)
public class ApplicationExceptionHandler extends ApiExceptionHandler {
    @ExceptionHandler(ApplicationSubmissionException.class)
    public ResponseEntity<ProblemResponse> submission(ApplicationSubmissionException exception, HttpServletRequest request) {
        if ("ACCOUNT_NOT_ALLOWED".equals(exception.code())) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
        }
        var response = problem(request, exception.status(), exception.code(), null,
                exception.fieldErrors(), new HttpHeaders(), exception);
        if (exception.reason() != null) response.getBody().setProperty("reason", exception.reason());
        return response;
    }

    @Override
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemResponse> serviceError(ResponseStatusException exception, HttpServletRequest request) {
        if ("applicationId must be a positive BIGINT".equals(exception.getReason())) {
            return problem(request, 400, "INVALID_RESOURCE_ID", null, List.of(), exception.getHeaders(), null);
        }
        if ("This account is not allowed to use TU-ClubHub".equals(exception.getReason())) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
            return problem(request, 403, "ACCOUNT_NOT_ALLOWED", null, List.of(), exception.getHeaders(), null);
        }
        return super.serviceError(exception, request);
    }

    @Override
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> unreadable(HttpMessageNotReadableException exception, HttpServletRequest request) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ApplicationSubmissionException validation) return submission(validation, request);
        }
        return super.unreadable(exception, request);
    }
}
