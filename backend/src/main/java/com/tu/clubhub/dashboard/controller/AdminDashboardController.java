package com.tu.clubhub.dashboard.controller;

import com.tu.clubhub.dashboard.dto.AdminDashboardStatsResponse;
import com.tu.clubhub.dashboard.service.AdminDashboardService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService service;

    public AdminDashboardController(AdminDashboardService service) {
        this.service = service;
    }

    @GetMapping(
            path = "/stats",
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminDashboardStatsResponse> stats(
            @RequestParam(name = "q", required = false)
            String q,

            @RequestParam(name = "categoryId", required = false)
            Long categoryId,

            @RequestParam(name = "academicYear", required = false)
            Integer academicYear,

            @RequestParam(name = "semester", required = false)
            Integer semester,

            @RequestParam(name = "clubStatus", defaultValue = "ALL")
            String clubStatus,

            @RequestParam(name = "page", defaultValue = "0")
            int page,

            @RequestParam(name = "size", defaultValue = "20")
            int size) {

        var result = service.stats(
                q,
                categoryId,
                academicYear,
                semester,
                clubStatus,
                page,
                size);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(result);
    }
}