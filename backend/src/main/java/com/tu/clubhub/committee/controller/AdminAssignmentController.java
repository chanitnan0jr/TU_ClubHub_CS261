package com.tu.clubhub.committee.controller;

import com.tu.clubhub.committee.dto.AssignmentRequests.*;
import com.tu.clubhub.committee.dto.AssignmentView;
import com.tu.clubhub.committee.service.AssignmentService;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/clubs/{clubId}/committee-assignments")
public class AdminAssignmentController {
    private final AssignmentService service;
    public AdminAssignmentController(AssignmentService service) { this.service = service; }
    @GetMapping("/{assignmentId}")
    public ResponseEntity<AssignmentView> get(@PathVariable String clubId, @PathVariable String assignmentId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(clubId, assignmentId));
    }
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AssignmentView> create(@PathVariable String clubId, @RequestBody Create request) {
        return created(clubId, service.create(clubId, request));
    }
    @PostMapping(path = "/{assignmentId}/replace", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AssignmentView> replace(@PathVariable String clubId, @PathVariable String assignmentId, @RequestBody Replace request) {
        return created(clubId, service.replace(clubId, assignmentId, request));
    }
    @PostMapping(path = "/{assignmentId}/revoke", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AssignmentView> revoke(@PathVariable String clubId, @PathVariable String assignmentId, @RequestBody Revoke request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.revoke(clubId, assignmentId, request));
    }
    private static ResponseEntity<AssignmentView> created(String clubId, AssignmentView row) {
        return ResponseEntity.created(URI.create("/api/v1/admin/clubs/" + clubId + "/committee-assignments/" + row.id()))
                .cacheControl(CacheControl.noStore()).body(row);
    }
}
