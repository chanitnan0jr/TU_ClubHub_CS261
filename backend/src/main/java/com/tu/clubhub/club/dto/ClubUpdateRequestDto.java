package com.tu.clubhub.club.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Writable club profile fields. Null optional values clear the stored value. */
public record ClubUpdateRequestDto(
		@NotBlank(message = "Club name is required")
		@Size(max = 200, message = "Club name must be at most 200 characters")
		String name,

		@NotBlank(message = "Club description is required")
		String description,

		String objectives,

		@Pattern(regexp = "^https://\\S+$", message = "URL must use HTTPS")
		@Size(max = 2048, message = "URL must be at most 2048 characters")
		String contactUrl,

		@Pattern(regexp = "^https://\\S+$", message = "URL must use HTTPS")
		@Size(max = 2048, message = "URL must be at most 2048 characters")
		String facebookUrl,

		@Pattern(regexp = "^https://\\S+$", message = "URL must use HTTPS")
		@Size(max = 2048, message = "URL must be at most 2048 characters")
		String instagramUrl,

		@Email(message = "Invalid email format")
		@Size(max = 254, message = "Email must be at most 254 characters")
		String contactEmail,

		@Pattern(regexp = "^https://\\S+$", message = "URL must use HTTPS")
		@Size(max = 2048, message = "URL must be at most 2048 characters")
		String imageUrl,

		@Pattern(regexp = "^https://\\S+$", message = "URL must use HTTPS")
		@Size(max = 2048, message = "URL must be at most 2048 characters")
		String bannerUrl) {
}
