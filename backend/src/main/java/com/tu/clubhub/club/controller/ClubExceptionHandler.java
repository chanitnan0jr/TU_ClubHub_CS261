package com.tu.clubhub.club.controller;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.tu.clubhub.auth.dto.ProblemResponse;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;

@RestControllerAdvice(assignableTypes = ClubController.class)
public class ClubExceptionHandler {

    @ExceptionHandler(ClubValidationException.class)
    public ResponseEntity<ProblemResponse> validationFailed(
            ClubValidationException exception,
            HttpServletRequest request
    ) {
        List<ProblemResponse.FieldError> errors =
                exception.getFieldErrors().entrySet().stream()
                        .map(entry -> new ProblemResponse.FieldError(
                                entry.getKey(),
                                "INVALID",
                                entry.getValue()
                        ))
                        .toList();

        return problem(
                request,
                400,
                "Request validation failed",
                "One or more request fields are invalid.",
                "VALIDATION_FAILED",
                errors
        );
    }

    @ExceptionHandler(ClubNotFoundException.class)
    public ResponseEntity<ProblemResponse> clubNotFound(
            HttpServletRequest request
    ) {
        return problem(
                request,
                404,
                "Club not found",
                "No club exists for this ID.",
                "CLUB_NOT_FOUND",
                List.of()
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemResponse> invalidResourceId(
            HttpServletRequest request
    ) {
        return problem(
                request,
                400,
                "Invalid resource ID",
                "clubId must be a valid decimal ID.",
                "INVALID_RESOURCE_ID",
                List.of()
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> invalidRequestBody(
            HttpServletRequest request
    ) {
        return problem(
                request,
                400,
                "Request validation failed",
                "Request body is missing or contains invalid JSON.",
                "VALIDATION_FAILED",
                List.of(new ProblemResponse.FieldError(
                        "request",
                        "INVALID",
                        "Provide a valid JSON request body."
                ))
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ProblemResponse> methodNotAllowed(
            HttpRequestMethodNotSupportedException exception,
            HttpServletRequest request
    ) {
        ResponseEntity<ProblemResponse> response = problem(
                request,
                405,
                "Method not allowed",
                "The requested HTTP method is not supported.",
                "METHOD_NOT_ALLOWED",
                List.of()
        );

        return ResponseEntity.status(response.getStatusCode())
                .headers(response.getHeaders())
                .allow(exception.getSupportedHttpMethods() == null
        ? new org.springframework.http.HttpMethod[0]
        : exception.getSupportedHttpMethods()
                .toArray(new org.springframework.http.HttpMethod[0]))
                .body(response.getBody());
    }

    @ExceptionHandler(DataAccessResourceFailureException.class)
    public ResponseEntity<ProblemResponse> databaseUnavailable(
            HttpServletRequest request
    ) {
        return problem(
                request,
                503,
                "Service unavailable",
                "The database is temporarily unavailable.",
                "SERVICE_UNAVAILABLE",
                List.of()
        );
    }

    private ResponseEntity<ProblemResponse> problem(
            HttpServletRequest request,
            int status,
            String title,
            String detail,
            String code,
            List<ProblemResponse.FieldError> fieldErrors
    ) {
        ProblemResponse body = new ProblemResponse(
                "urn:tuclubhub:problem:"
                        + code.toLowerCase(Locale.ROOT).replace('_', '-'),
                title,
                status,
                detail,
                request.getRequestURI(),
                code,
                UUID.randomUUID().toString(),
                fieldErrors
        );

        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore())
                .body(body);
    }
}