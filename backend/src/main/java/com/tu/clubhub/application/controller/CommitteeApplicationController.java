package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.CommitteeClubApplicationDetail;
import com.tu.clubhub.application.dto.CommitteeClubApplicationPage;
import com.tu.clubhub.application.service.CommitteeApplicationService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clubs/{id}/applications")
public class CommitteeApplicationController {
    private final CommitteeApplicationService service;
    public CommitteeApplicationController(CommitteeApplicationService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<CommitteeClubApplicationPage> list(@PathVariable String id,
            @RequestParam(required = false) String roundId, @RequestParam(required = false) String status,
            @RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.list(id, roundId, status, q, page, size));
    }

    @GetMapping("/{appId}")
    public ResponseEntity<CommitteeClubApplicationDetail> detail(@PathVariable String id, @PathVariable String appId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.detail(id, appId));
    }
}
