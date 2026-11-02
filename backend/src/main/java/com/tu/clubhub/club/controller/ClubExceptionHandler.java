package com.tu.clubhub.club.controller;

import com.tu.clubhub.auth.dto.ProblemResponse;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import com.tu.clubhub.club.service.PublicClubService.InvalidPublicClubIdException;
import com.tu.clubhub.common.error.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {ClubController.class, PublicClubController.class})
@Order(0)
public class ClubExceptionHandler extends ApiExceptionHandler {
    @ExceptionHandler(ClubValidationException.class)
    public ResponseEntity<ProblemResponse> invalidClub(ClubValidationException exception, HttpServletRequest request) {
        return problem(request, 400, "VALIDATION_FAILED", null,
                exception.getFieldErrors().entrySet().stream().map(entry ->
                        new ProblemResponse.FieldError(entry.getKey(), "INVALID", entry.getValue())).toList(),
                new HttpHeaders(), null);
    }

    @ExceptionHandler(ClubNotFoundException.class)
    public ResponseEntity<ProblemResponse> missingClub(HttpServletRequest request) {
        return problem(request, 404, "CLUB_NOT_FOUND", null, List.of(), new HttpHeaders(), null);
    }

    @ExceptionHandler(InvalidPublicClubIdException.class)
    public ResponseEntity<ProblemResponse> invalidId(HttpServletRequest request) {
        return problem(request, 400, "INVALID_RESOURCE_ID", null, List.of(), new HttpHeaders(), null);
    }
}
