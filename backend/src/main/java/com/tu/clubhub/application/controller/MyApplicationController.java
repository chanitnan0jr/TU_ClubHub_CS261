package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.ApplicantApplicationDetail;
import com.tu.clubhub.application.dto.ApplicantApplicationPage;
import com.tu.clubhub.application.service.MyApplicationService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/applications")
public class MyApplicationController {

    private final MyApplicationService service;

    public MyApplicationController(MyApplicationService service) {
        this.service = service;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicantApplicationPage> list(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.list(page, size));
    }

    @GetMapping(
            path = "/{applicationId}",
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApplicantApplicationDetail> detail(
            @PathVariable("applicationId") String applicationId) {

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.detail(applicationId));
    }
}