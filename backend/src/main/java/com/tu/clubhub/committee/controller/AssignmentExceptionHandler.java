package com.tu.clubhub.committee.controller;

import com.tu.clubhub.auth.dto.ProblemResponse;
import com.tu.clubhub.committee.service.AssignmentException;
import com.tu.clubhub.common.error.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Order(0)
@RestControllerAdvice(assignableTypes = AdminAssignmentController.class)
public class AssignmentExceptionHandler extends ApiExceptionHandler {
    @ExceptionHandler(AssignmentException.class)
    public ResponseEntity<ProblemResponse> assignment(AssignmentException exception, HttpServletRequest request) {
        clearSessionIfAccountNotAllowed(exception.code(), request);
        var response = problem(request, exception.status(), exception.code(), null, exception.fields(), new HttpHeaders(), exception);
        if (exception.reason() != null) response.getBody().setProperty("reason", exception.reason());
        return response;
    }
    @Override @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> unreadable(HttpMessageNotReadableException exception, HttpServletRequest request) {
        var validation = findCause(exception, AssignmentException.class);
        return validation != null ? assignment(validation, request) : super.unreadable(exception, request);
    }
}
