package com.tu.clubhub.auth.dto;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

/** Shared wire contract: standard members plus code/traceId/fieldErrors extensions. */
public final class ProblemResponse extends ProblemDetail {
    // Keep the existing advice constructor signature; type/title are canonicalized from code.
    public ProblemResponse(String type, String title, int status, String detail, String instance,
            String code, String traceId, List<FieldError> fieldErrors) {
        super(status);
        String suffix = "VALIDATION_FAILED".equals(code) ? "validation-error"
                : code.toLowerCase(Locale.ROOT).replace('_', '-');
        setType(URI.create("urn:tuclubhub:problem:" + suffix));
        setTitle(titleFor(code, status));
        // Hidden resources have exactly the same public description as absent resources.
        setDetail(switch (code) {
            case "CLUB_NOT_FOUND" -> "No club was found for this identifier.";
            case "RESOURCE_NOT_FOUND" -> "No resource was found for this identifier.";
            case "INTERNAL_ERROR" -> "The request could not be completed.";
            default -> detail == null || detail.isBlank() ? defaultDetail(code) : detail;
        });
        setInstance(safeInstance(instance));
        setProperty("code", code);
        setProperty("traceId", traceId);
        setProperty("fieldErrors", fieldErrors == null ? List.of() : List.copyOf(fieldErrors));
    }

    private static URI safeInstance(String path) {
        try { return URI.create(path == null ? "/api/v1" : path.split("[?#]", 2)[0]); }
        catch (IllegalArgumentException exception) { return URI.create("/api/v1"); }
    }

    public static String titleFor(String code, int status) {
        return switch (code) {
            case "INVALID_RESOURCE_ID" -> "Invalid resource identifier";
            case "VALIDATION_FAILED" -> "Request validation failed";
            case "AUTHENTICATION_REQUIRED" -> "Authentication required";
            case "AUTHENTICATION_FAILED" -> "Authentication failed";
            case "CSRF_INVALID" -> "Request rejected";
            case "ACCOUNT_NOT_ALLOWED" -> "Account not allowed";
            case "ACCESS_DENIED" -> "Access denied";
            case "CLUB_NOT_FOUND" -> "Club not found";
            case "RESOURCE_NOT_FOUND" -> "Resource not found";
            case "RESOURCE_CONFLICT" -> "Resource state conflict";
            case "METHOD_NOT_ALLOWED" -> "Method not allowed";
            case "INTERNAL_ERROR" -> "Internal server error";
            case "SERVICE_UNAVAILABLE" -> "Service unavailable";
            case "AUTH_PROVIDER_UNAVAILABLE" -> "Authentication provider unavailable";
            case "RATE_LIMITED" -> "Too many login attempts";
            default -> HttpStatus.resolve(status) == null ? "Request failed" : HttpStatus.valueOf(status).getReasonPhrase();
        };
    }

    public static String codeFor(int status) {
        return switch (status) {
            case 400 -> "VALIDATION_FAILED";
            case 401 -> "AUTHENTICATION_REQUIRED";
            case 403 -> "ACCESS_DENIED";
            case 404 -> "RESOURCE_NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            case 409 -> "RESOURCE_CONFLICT";
            case 500 -> "INTERNAL_ERROR";
            case 503 -> "SERVICE_UNAVAILABLE";
            default -> "HTTP_" + status;
        };
    }

    public static String defaultDetail(String code) {
        return switch (code) {
            case "AUTHENTICATION_REQUIRED" -> "Sign in to access this resource.";
            case "AUTHENTICATION_FAILED" -> "The supplied credentials could not be verified.";
            case "ACCESS_DENIED" -> "You are not allowed to access this resource.";
            case "CSRF_INVALID" -> "The CSRF token is missing or invalid.";
            case "ACCOUNT_NOT_ALLOWED" -> "This account is not allowed to use TU-ClubHub.";
            case "INVALID_RESOURCE_ID" -> "A resource identifier has an invalid format.";
            case "VALIDATION_FAILED" -> "One or more request fields or parameters are invalid.";
            case "RESOURCE_CONFLICT" -> "The request conflicts with the current resource state.";
            case "METHOD_NOT_ALLOWED" -> "The requested HTTP method is not supported.";
            case "HTTP_415" -> "The request content type is not supported.";
            case "AUTH_PROVIDER_UNAVAILABLE" -> "Authentication is temporarily unavailable.";
            case "SERVICE_UNAVAILABLE" -> "The database is temporarily unavailable.";
            default -> "The request could not be completed.";
        };
    }

    /** Map form for servlet fallback errors; keep the same flattened extensions as MVC. */
    public Map<String, Object> asMap() {
        var result = new LinkedHashMap<String, Object>();
        result.put("type", getType().toString()); result.put("title", getTitle()); result.put("status", getStatus());
        result.put("detail", getDetail()); result.put("instance", getInstance().toString());
        if (getProperties() != null) result.putAll(getProperties());
        return result;
    }

    public record FieldError(String field, String code, String message) {}
}
