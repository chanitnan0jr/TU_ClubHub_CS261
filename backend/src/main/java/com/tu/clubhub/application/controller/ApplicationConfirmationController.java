
package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.ApplicationConfirmationResponse;
import com.tu.clubhub.application.service.ApplicationConfirmationService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/applications")
public class ApplicationConfirmationController {

    private final ApplicationConfirmationService service;

    public ApplicationConfirmationController(
            ApplicationConfirmationService service
    ) {
        this.service = service;
    }

    @PostMapping(
            path = "/{applicationId}/confirm",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApplicationConfirmationResponse> confirm(
            @PathVariable("applicationId") String id
    ) {
        return response(service.confirm(id));
    }

    @PostMapping(
            path = "/{applicationId}/decline",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApplicationConfirmationResponse> decline(
            @PathVariable("applicationId") String id
    ) {
        return response(service.decline(id));
    }

    private static <T> ResponseEntity<T> response(T value) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(value);
    }
}
