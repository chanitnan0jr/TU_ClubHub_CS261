package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.*;
import com.tu.clubhub.application.service.SelectionResultService;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rounds/{roundId}")
public class SelectionResultController {
    public record BatchResponse(List<CommitteeApplicationDetail> items) {
        public BatchResponse { items = List.copyOf(items); }
    }
    private final SelectionResultService service;
    public SelectionResultController(SelectionResultService service) { this.service = service; }

    @GetMapping(path = "/applications/{applicationId}/decision", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CommitteeApplicationDetail> editor(@PathVariable String roundId, @PathVariable String applicationId) {
        return response(service.editor(roundId, applicationId));
    }
    @PutMapping(path = "/applications/{applicationId}/decision", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CommitteeApplicationDetail> decide(@PathVariable String roundId, @PathVariable String applicationId,
            @RequestBody ApplicationDecisionRequest request) {
        return response(service.decide(roundId, applicationId, request));
    }
    @PutMapping(path = "/application-decisions", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<BatchResponse> batch(@PathVariable String roundId, @RequestBody BatchApplicationDecisionRequest request) {
        return response(new BatchResponse(service.decideBatch(roundId, request)));
    }
    @PostMapping(path = "/publish-results", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PublishResultsResponse> publish(@PathVariable String roundId, @RequestBody PublishResultsRequest request) {
        return response(service.publish(roundId, request));
    }
    private static <T> ResponseEntity<T> response(T value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
