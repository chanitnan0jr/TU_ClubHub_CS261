package com.tu.clubhub.club.dto;

import java.time.Instant;

/** Public summary of a published recruitment round while its application window is open. */
public record OpenPublicRecruitmentRoundDto(
        String id,
        String name,
        Instant opensAt,
        Instant closesAt) {
}
