package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.dto.ProblemResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestControllerAdvice(
        assignableTypes = {
                RecruitmentRoundController.class,
                ApplicationQuestionController.class
        }
)
public class RecruitmentRoundExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(
                    RecruitmentRoundExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemResponse> invalidBody(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {

        List<ProblemResponse.FieldError> errors =
                exception.getBindingResult()
                        .getAllErrors()
                        .stream()
                        .map(error -> {
                            String field = error instanceof FieldError fieldError
                                    ? fieldError.getField()
                                    : "request";

                            return new ProblemResponse.FieldError(
                                    field,
                                    "INVALID",
                                    error.getDefaultMessage());
                        })
                        .toList();

        return problem(
                request,
                400,
                "Request validation failed",
                "One or more request fields are invalid.",
                "VALIDATION_FAILED",
                errors,
                new HttpHeaders());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemResponse> invalidServiceInput(
            ConstraintViolationException exception,
            HttpServletRequest request) {

        List<ProblemResponse.FieldError> errors =
                exception.getConstraintViolations()
                        .stream()
                        .map(violation ->
                                new ProblemResponse.FieldError(
                                        violation.getPropertyPath().toString(),
                                        "INVALID",
                                        violation.getMessage()))
                        .toList();

        return problem(
                request,
                400,
                "Request validation failed",
                "One or more request fields are invalid.",
                "VALIDATION_FAILED",
                errors,
                new HttpHeaders());
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemResponse> invalidMethodArguments(
            HandlerMethodValidationException exception,
            HttpServletRequest request) {

        if (exception.isForReturnValue()) {
            return internalError(exception, request);
        }

        List<ProblemResponse.FieldError> errors =
                new ArrayList<>();

        List<ProblemResponse.FieldError> idErrors =
                new ArrayList<>();

        for (var result : exception.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                for (var error : parameterErrors.getFieldErrors()) {
                    errors.add(new ProblemResponse.FieldError(
                            error.getField(),
                            "INVALID",
                            error.getDefaultMessage()));
                }

                for (var error : parameterErrors.getGlobalErrors()) {
                    errors.add(new ProblemResponse.FieldError(
                            "request",
                            "INVALID",
                            error.getDefaultMessage()));
                }
            } else {
                var parameter = result.getMethodParameter();

                String field = parameter.getParameterName();

                if (field == null) {
                    field = "parameter" + parameter.getParameterIndex();
                }

                var target = parameter.hasParameterAnnotation(
                        PathVariable.class) ? idErrors : errors;

                for (var error : result.getResolvableErrors()) {
                    target.add(new ProblemResponse.FieldError(
                            field,
                            "INVALID",
                            error.getDefaultMessage()));
                }
            }
        }

        // Path IDs that fail validation (such as 0) share the code
        // used for IDs that cannot be parsed.
        if (!idErrors.isEmpty()) {
            return invalidResourceId(request, idErrors);
        }

        return problem(
                request,
                400,
                "Request validation failed",
                "One or more request fields or parameters are invalid.",
                "VALIDATION_FAILED",
                errors,
                exception.getHeaders());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemResponse> invalidParameter(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request) {

        return invalidResourceId(
                request,
                List.of(new ProblemResponse.FieldError(
                        exception.getName(),
                        "INVALID",
                        "Must be a valid value of the expected type.")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> unreadableBody(
            HttpServletRequest request) {

        return problem(
                request,
                400,
                "Request validation failed",
                "Request body is missing or contains invalid JSON.",
                "VALIDATION_FAILED",
                List.of(new ProblemResponse.FieldError(
                        "request",
                        "INVALID",
                        "Provide a valid JSON request body.")),
                new HttpHeaders());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemResponse> serviceError(
            ResponseStatusException exception,
            HttpServletRequest request) {

        int status = exception.getStatusCode().value();

        String code = switch (status) {
            case 400 -> "VALIDATION_FAILED";
            case 401 -> "AUTHENTICATION_REQUIRED";
            case 403 -> "ACCESS_DENIED";
            case 404 -> "RESOURCE_NOT_FOUND";
            case 409 -> "RESOURCE_CONFLICT";
            default -> "HTTP_" + status;
        };

        HttpStatus httpStatus = HttpStatus.resolve(status);

        String title = httpStatus == null
                ? "Request failed"
                : httpStatus.getReasonPhrase();

        String detail = status >= 500
                ? "The request could not be completed."
                : exception.getReason();

        if (detail == null || detail.isBlank()) {
            detail = title;
        }

        String traceId = UUID.randomUUID().toString();

        if (status >= 500) {
            logServerError(exception, request, traceId);
        }

        return buildProblem(
                request,
                status,
                title,
                detail,
                code,
                traceId,
                List.of(),
                exception.getHeaders());
    }

    @ExceptionHandler({
            DataAccessResourceFailureException.class,
            CannotCreateTransactionException.class
    })
    public ResponseEntity<ProblemResponse> databaseUnavailable(
            Exception exception,
            HttpServletRequest request) {

        String traceId = UUID.randomUUID().toString();

        logServerError(exception, request, traceId);

        return buildProblem(
                request,
                503,
                "Service unavailable",
                "The database is temporarily unavailable.",
                "SERVICE_UNAVAILABLE",
                traceId,
                List.of(),
                new HttpHeaders());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemResponse> otherError(
            Exception exception,
            HttpServletRequest request) throws Exception {

        // ให้ Spring Security จัดการด้วยกลไกเดิม
        if (exception instanceof AuthenticationException
                || exception instanceof AccessDeniedException) {
            throw exception;
        }

        // รักษา HTTP status และ headers ของ framework
        if (exception instanceof ErrorResponse error) {
            int status = error.getStatusCode().value();

            HttpStatus httpStatus = HttpStatus.resolve(status);

            String title = httpStatus == null
                    ? "Request failed"
                    : httpStatus.getReasonPhrase();

            String traceId = UUID.randomUUID().toString();

            if (status >= 500) {
                logServerError(exception, request, traceId);
            }

            return buildProblem(
                    request,
                    status,
                    title,
                    status >= 500
                            ? "The request could not be completed."
                            : title,
                    "HTTP_" + status,
                    traceId,
                    List.of(),
                    error.getHeaders());
        }

        return internalError(exception, request);
    }

    private ResponseEntity<ProblemResponse> invalidResourceId(
            HttpServletRequest request,
            List<ProblemResponse.FieldError> fieldErrors) {

        return problem(
                request,
                400,
                "Invalid request parameter",
                "A request parameter has an invalid format.",
                "INVALID_RESOURCE_ID",
                fieldErrors,
                new HttpHeaders());
    }

    private ResponseEntity<ProblemResponse> internalError(
            Exception exception,
            HttpServletRequest request) {

        String traceId = UUID.randomUUID().toString();

        logServerError(exception, request, traceId);

        return buildProblem(
                request,
                500,
                "Internal server error",
                "The request could not be completed.",
                "INTERNAL_ERROR",
                traceId,
                List.of(),
                new HttpHeaders());
    }

    private void logServerError(
            Exception exception,
            HttpServletRequest request,
            String traceId) {

        log.error(
                "Recruitment request failed: traceId={}, path={}",
                traceId,
                request.getRequestURI(),
                exception);
    }

    private ResponseEntity<ProblemResponse> problem(
            HttpServletRequest request,
            int status,
            String title,
            String detail,
            String code,
            List<ProblemResponse.FieldError> fieldErrors,
            HttpHeaders headers) {

        return buildProblem(
                request,
                status,
                title,
                detail,
                code,
                UUID.randomUUID().toString(),
                fieldErrors,
                headers);
    }

    private ResponseEntity<ProblemResponse> buildProblem(
            HttpServletRequest request,
            int status,
            String title,
            String detail,
            String code,
            String traceId,
            List<ProblemResponse.FieldError> fieldErrors,
            HttpHeaders headers) {

        // The contract names the validation type validation-error.
        String typeSuffix = "VALIDATION_FAILED".equals(code)
                ? "validation-error"
                : code.toLowerCase(Locale.ROOT).replace('_', '-');

        ProblemResponse body = new ProblemResponse(
                "urn:tuclubhub:problem:" + typeSuffix,
                title,
                status,
                detail,
                request.getRequestURI(),
                code,
                traceId,
                fieldErrors);

        return ResponseEntity.status(status)
                .headers(headers)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore())
                .body(body);
    }
}