package com.tu.clubhub.application;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/applications")
@CrossOrigin(origins = "*")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * GET /api/v1/applications/my
     * ดึงประวัติใบสมัครเฉพาะของนักศึกษาที่กำลังล็อกอินอยู่ (Privacy Isolation)
     */
    @GetMapping("/my")
    public ResponseEntity<List<ApplicationResponseDto>> getMyApplications(
            @RequestHeader(value = "X-User-Id", defaultValue = "student-001") String userId) {
        List<ApplicationResponseDto> applications = applicationService.getApplicationsByUserId(userId);
        return ResponseEntity.ok(applications);
    }
}