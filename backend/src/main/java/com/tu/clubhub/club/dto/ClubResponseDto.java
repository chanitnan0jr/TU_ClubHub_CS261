package com.tu.clubhub.club.dto;

import java.time.Instant;
import java.util.List;

/** Public club profile response shared by club detail and update operations. */
public record ClubResponseDto(
		String id,
		String categoryId,
		String name,
		String description,
		String objectives,
		String contactUrl,
		String facebookUrl,
		String instagramUrl,
		String contactEmail,
		String affiliationLevel,
		String affiliationName,
		String imageUrl,
		String bannerUrl,
		String status,
		ClubCategoryDto category,
		List<ClubTagDto> tags,
		List<PublicRecruitmentRoundDto> recruitmentRounds) {

	public record ClubCategoryDto(String id, String name) {
	}

	public record ClubTagDto(String id, String name) {
	}

	public record PublicRecruitmentRoundDto(
			String id,
			String name,
			Instant opensAt,
			Instant closesAt,
			Instant closedAt) {
	}
}
