package com.tu.clubhub.common.error;

import com.tu.clubhub.auth.dto.ProblemResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
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

/** One framework-error implementation reused by scoped domain advice and unknown API routes. */
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
public class ApiExceptionHandler {
    private static final Map<String, String> CONFLICT_REASONS = Map.ofEntries(
            Map.entry("Question has answers", "QUESTION_HAS_ANSWERS"),
            Map.entry("Question has answers and cannot be deleted", "QUESTION_HAS_ANSWERS"),
            Map.entry("Question is referenced by application data and cannot be deleted", "QUESTION_HAS_ANSWERS"),
            Map.entry("Round was modified; reload before retrying", "VERSION_MISMATCH"),
            Map.entry("Only draft rounds can be edited", "ROUND_NOT_EDITABLE"),
            Map.entry("Only draft rounds can be published", "ROUND_NOT_EDITABLE"),
            Map.entry("Only open draft rounds can have their questions edited", "ROUND_NOT_EDITABLE"));
    // These are application-owned constants, never arbitrary exception messages/rejected values.
    private static final Set<String> SAFE_SERVICE_DETAILS = Set.of(
            "Only draft rounds can be edited", "Rounds with applications cannot be replaced",
            "Round was modified; reload before retrying", "Only draft rounds can be published",
            "Cannot publish a round whose closing time has passed", "Round could not be published; reload and retry",
            "Only published rounds can be closed", "Round has already been closed", "Round has not opened yet",
            "Round has already reached its closing time", "Round could not be closed; reload and retry",
            "Request body is required", "Opening, closing and confirmation times are required",
            "Opening time must precede closing time", "Confirmation deadline must follow closing time",
            "Results schedule must be within [opensAt, deadline)", "clubId must be positive", "roundId must be positive",
            "A non-negative version is required", "Question changed during update; reload and retry",
            "Question has answers and cannot be deleted", "Question changed during delete; reload and retry",
            "Question is referenced by application data and cannot be deleted", "questionIds is required",
            "questionIds must list every question in this round exactly once", "Question order could not be updated; reload and retry",
            "Only open draft rounds can have their questions edited", "Rounds with applications cannot have questions edited",
            "questionText must not be blank", "isRequired is required", "Round changed during question edit; reload and retry",
            "Question has answers", "Round was modified",
            "q must not exceed 200 characters", "categoryId must be positive",
            "academicYear must be between 1 and 32767", "semester must be between 1 and 3",
            "clubStatus must be ALL, ACTIVE or INACTIVE", "page must be non-negative",
            "size must be between 1 and 100");
    private static final Set<String> VALIDATED_QUERY_PARAMS = Set.of(
            "q", "categoryId", "academicYear", "semester", "clubStatus", "page", "size");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemResponse> invalidBody(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var fields = exception.getBindingResult().getAllErrors().stream()
                .map(error -> field(error instanceof FieldError f ? f.getField() : "request")).toList();
        return problem(request, 400, "VALIDATION_FAILED", null, fields, new HttpHeaders(), null);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemResponse> invalidServiceInput(ConstraintViolationException exception, HttpServletRequest request) {
        return problem(request, 400, "VALIDATION_FAILED", null, exception.getConstraintViolations().stream()
                .map(v -> field(v.getPropertyPath().toString())).toList(), new HttpHeaders(), null);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemResponse> invalidMethodArguments(HandlerMethodValidationException exception, HttpServletRequest request) {
        if (exception.isForReturnValue()) return problem(request, 500, "INTERNAL_ERROR", null, List.of(), new HttpHeaders(), exception);
        var fields = new ArrayList<ProblemResponse.FieldError>();
        boolean id = false;
        for (var result : exception.getParameterValidationResults()) {
            var parameter = result.getMethodParameter();
            id |= parameter.hasParameterAnnotation(PathVariable.class);
            if (result instanceof ParameterErrors errors) {
                errors.getFieldErrors().forEach(error -> fields.add(field(error.getField())));
                errors.getGlobalErrors().forEach(error -> fields.add(field("request")));
            } else fields.add(field(parameter.getParameterName() == null ? "request" : parameter.getParameterName()));
        }
        return problem(request, 400, id ? "INVALID_RESOURCE_ID" : "VALIDATION_FAILED", null, fields, exception.getHeaders(), null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemResponse> invalidParameter(MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
        return problem(request, 400, exception.getParameter().hasParameterAnnotation(PathVariable.class)
                ? "INVALID_RESOURCE_ID" : "VALIDATION_FAILED", null, List.of(field(exception.getName())), new HttpHeaders(), null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemResponse> unreadable(HttpMessageNotReadableException exception, HttpServletRequest request) {
        return problem(request, 400, "VALIDATION_FAILED", "Request body is missing or contains invalid JSON.",
                List.of(field("request")), new HttpHeaders(), null);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemResponse> serviceError(ResponseStatusException exception, HttpServletRequest request) {
        int status = exception.getStatusCode().value();
        String code = ProblemResponse.codeFor(status);
        String detail = status == 400 || status == 409
                ? SAFE_SERVICE_DETAILS.stream().filter(value -> value.equals(exception.getReason())).findFirst().orElse(null) : null;
        String param = detail == null ? null : detail.split(" ", 2)[0];
        var fields = status == 400 && param != null && VALIDATED_QUERY_PARAMS.contains(param)
                ? List.of(new ProblemResponse.FieldError(param, "INVALID", detail)) : List.<ProblemResponse.FieldError>of();
        var response = problem(request, status, code, detail, fields, exception.getHeaders(), exception);
        if (status == 409 && detail != null && CONFLICT_REASONS.containsKey(detail))
            response.getBody().setProperty("reason", CONFLICT_REASONS.get(detail));
        return response;
    }

    @ExceptionHandler({DataAccessResourceFailureException.class, CannotCreateTransactionException.class})
    public ResponseEntity<ProblemResponse> unavailable(Exception exception, HttpServletRequest request) {
        return problem(request, 503, "SERVICE_UNAVAILABLE", null, List.of(), new HttpHeaders(), exception);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemResponse> unexpected(Exception exception, HttpServletRequest request) throws Exception {
        if (!request.getRequestURI().startsWith("/api/")) throw exception;
        if (exception instanceof AuthenticationException || exception instanceof AccessDeniedException) throw exception;
        if (exception instanceof ErrorResponse error) {
            int status = error.getStatusCode().value();
            return problem(request, status, ProblemResponse.codeFor(status), null, List.of(), error.getHeaders(), exception);
        }
        return problem(request, 500, "INTERNAL_ERROR", null, List.of(), new HttpHeaders(), exception);
    }

    protected static ProblemResponse.FieldError field(String name) {
        return new ProblemResponse.FieldError(name, "INVALID", "Value does not meet this field's constraints.");
    }

    public static ResponseEntity<ProblemResponse> problem(HttpServletRequest request, int status, String code, String detail,
            List<ProblemResponse.FieldError> fields, HttpHeaders headers, Exception exception) {
        String traceId = UUID.randomUUID().toString();
        if (status >= 500 && exception != null) logFailure(exception, request, traceId);
        var body = new ProblemResponse(null, null, status, detail, request.getRequestURI(), code, traceId, fields);
        return ResponseEntity.status(status).headers(headers).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore()).body(body);
    }

    /** Do not log exception messages/SQL/bind values, which can contain credentials or rejected input. */
    public static void logFailure(Throwable exception, HttpServletRequest request, String traceId) {
        var frames = exception.getStackTrace();
        LoggerFactory.getLogger(ApiExceptionHandler.class).error("API failure: traceId={}, method={}, path={}, errorType={}, location={}",
                traceId, request.getMethod(), request.getRequestURI(), exception.getClass().getName(),
                frames.length == 0 ? "unavailable" : frames[0].toString());
    }
}
