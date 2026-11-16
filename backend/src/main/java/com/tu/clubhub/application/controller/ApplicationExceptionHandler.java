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
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = {
        ApplicationController.class,
        ClubApplicationController.class,
        CommitteeApplicationController.class,
        SelectionResultController.class,
        MyApplicationController.class
})
@Order(0)
public class ApplicationExceptionHandler extends ApiExceptionHandler {
    @ExceptionHandler(ApplicationSubmissionException.class)
    public ResponseEntity<ProblemResponse> submission(ApplicationSubmissionException exception, HttpServletRequest request) {
        clearSessionIfAccountNotAllowed(exception.code(), request);
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
            clearSessionIfAccountNotAllowed("ACCOUNT_NOT_ALLOWED", request);
            return problem(request, 403, "ACCOUNT_NOT_ALLOWED", null, List.of(), exception.getHeaders(), null);
        }
        return super.serviceError(exception, request);
    }

    @Override
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> unreadable(HttpMessageNotReadableException exception, HttpServletRequest request) {
        var validation = findCause(exception, ApplicationSubmissionException.class);
        return validation != null ? submission(validation, request) : super.unreadable(exception, request);
    }
}
