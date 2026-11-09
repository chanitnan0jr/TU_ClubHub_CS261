package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.ApplicantApplicationSummary;
import com.tu.clubhub.application.dto.ApplicationSubmission;
import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.dto.RoundApplicationForm;
import com.tu.clubhub.application.service.ApplicationService;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** HTTP boundary for Task42 sections 11 and 12 and Task64 (US-04); the service owns the transactions. */
@RestController
@RequestMapping("/api/v1")
public class ApplicationController {
    private final ApplicationService service;

    public ApplicationController(ApplicationService service) { this.service = service; }

    @GetMapping(path = "/rounds/{roundId}/application-form", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RoundApplicationForm> form(@PathVariable String roundId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.form(roundId));
    }

    @PostMapping(path = "/rounds/{roundId}/applications", consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicationSubmission> submit(@PathVariable String roundId,
            @RequestBody ApplicationSubmissionRequest request) {
        // The proxied service commits before returning, so never advertise an uncommitted receipt.
        var receipt = service.submit(roundId, request);
        return ResponseEntity.created(URI.create("/api/v1/me/applications/" + receipt.id()))
                .cacheControl(CacheControl.noStore()).body(receipt);
    }

    @GetMapping(path = "/me/applications", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicantApplicationSummary.Page> listMyApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.listMyApplications(page, size));
    }

    @GetMapping(path = "/me/applications/{applicationId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicantApplicationSummary.Detail> getMyApplicationDetail(
            @PathVariable String applicationId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.getMyApplicationDetail(applicationId));
    }
}
