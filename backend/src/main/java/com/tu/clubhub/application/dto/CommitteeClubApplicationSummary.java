package com.tu.clubhub.application.dto;

import java.time.Instant;

/** Minimum applicant projection for authorized selection; never a persistence entity. */
public record CommitteeClubApplicationSummary(String id, String roundId, Applicant applicant,
        Instant submittedAt, String status) {
    public record Applicant(String userId, String studentCode, String displayName, String email,
            String facultyName, String departmentName, String programName, Integer studyYear) {}
}
