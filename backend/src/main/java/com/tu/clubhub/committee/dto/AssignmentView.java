package com.tu.clubhub.committee.dto;

import java.time.Instant;

/** Admin-only appointment metadata; no applicant answers, portfolio or account entity. */
public record AssignmentView(String id, String clubId, String membershipId, String userId,
        String positionName, String permissionRole, Instant startsAt, Instant endsAt, String status,
        String assignedBy, String assignmentReason, String replacesAssignmentId, String revokedBy,
        Instant revokedAt, String revocationReason, Instant createdAt, Instant updatedAt, long version) {}
