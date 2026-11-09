package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.ApplicationSubmission;
import com.tu.clubhub.application.dto.ClubApplicationSubmissionRequest;
import com.tu.clubhub.application.service.ApplicationService;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Club-scoped entry point sharing the round submission transaction and persistence. */
@RestController
@RequestMapping("/api/v1/clubs/{id}/applications")
public class ClubApplicationController {
    private final ApplicationService service;

    public ClubApplicationController(ApplicationService service) { this.service = service; }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicationSubmission> submit(@PathVariable String id,
            @RequestBody ClubApplicationSubmissionRequest request) {
        var receipt = service.submitForClub(id, request.roundId(), request.submission());
        return ResponseEntity.created(URI.create("/api/v1/me/applications/" + receipt.id()))
                .cacheControl(CacheControl.noStore()).body(receipt);
    }
}
