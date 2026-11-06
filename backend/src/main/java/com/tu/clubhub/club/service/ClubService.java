package com.tu.clubhub.club.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.validation.Validator;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.ClubResponseDto;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.committee.security.ClubSecurity;

@Service
public class ClubService {

    private static final int MAX_TAGS = 10;

    private final Validator validator;
    private final ClubRepository clubRepository;
    private final ClubProfileQueryRepository profileQueryRepository;
    private final ClubSecurity clubSecurity;

    public ClubService(
            Validator validator,
            ClubRepository clubRepository,
            ClubProfileQueryRepository profileQueryRepository,
            ClubSecurity clubSecurity
    ) {
        this.validator = validator;
        this.clubRepository = clubRepository;
        this.profileQueryRepository = profileQueryRepository;
        this.clubSecurity = clubSecurity;
    }

    // ตรวจข้อมูล แก้ไข และบันทึกชมรม
    @Transactional
    public ClubResponseDto updateClub(
            Long clubId,
            ClubUpdateRequestDto request
    ) {
        // ตรวจสิทธิ์ซ้ำภายใน Transaction: ไม่พึ่ง @RequireClubCommittee ของ Controller อย่างเดียว
        // และปฏิเสธก่อนอ่านหรือแก้ข้อมูลชมรม
        if (!clubSecurity.isCommittee(clubId)) {
            throw new AccessDeniedException(
                    "You must be an active committee member of this club");
        }

        validateUpdateRequest(request);

        // ล็อกแถวชมรม ให้คำขอแก้ไขพร้อมกัน (รวมชุดแท็ก) ทำทีละคำขอ
        Club club = clubRepository.findByIdForUpdate(clubId)
                .orElseThrow(ClubNotFoundException::new);

        Long categoryId = Long.valueOf(request.categoryId());
        List<Long> tagIds = request.tagIds().stream().map(Long::valueOf).toList();
        validateReferences(categoryId, tagIds);

        club.setCategoryId(categoryId);
        club.setName(request.name());
        club.setDescription(request.description());
        club.setObjectives(request.objectives());
        club.setContactUrl(request.contactUrl());
        club.setFacebookUrl(request.facebookUrl());
        club.setInstagramUrl(request.instagramUrl());
        club.setContactEmail(request.contactEmail());
        club.setImageUrl(request.imageUrl());
        club.setBannerUrl(request.bannerUrl());

        Club savedClub = clubRepository.save(club);
        // Same transaction as the profile update: any later failure rolls back both.
        profileQueryRepository.replaceClubTags(clubId, tagIds);

        return toResponse(savedClub);
    }

    // หมวดหมู่และแท็กต้องมีอยู่จริง (ตรวจหลังรูปแบบ id ผ่านแล้ว)
    private void validateReferences(Long categoryId, List<Long> tagIds) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (!profileQueryRepository.categoryExists(categoryId)) {
            errors.put("categoryId", "Category does not exist");
        }

        Set<Long> existingTagIds = profileQueryRepository.findExistingTagIds(tagIds);
        for (int i = 0; i < tagIds.size(); i++) {
            if (!existingTagIds.contains(tagIds.get(i))) {
                errors.put("tagIds[" + i + "]", "Tag does not exist");
            }
        }

        if (!errors.isEmpty()) {
            throw new ClubValidationException(errors);
        }
    }

    // รวมข้อมูลสำหรับส่งกลับผ่าน API
    private ClubResponseDto toResponse(Club club) {
        return new ClubResponseDto(
                club.getId().toString(),
                club.getCategoryId() == null
                        ? null
                        : club.getCategoryId().toString(),
                club.getName(),
                club.getDescription(),
                club.getObjectives(),
                club.getContactUrl(),
                club.getFacebookUrl(),
                club.getInstagramUrl(),
                club.getContactEmail(),
                club.getAffiliationLevel(),
                club.getAffiliationName(),
                club.getImageUrl(),
                club.getBannerUrl(),
                club.getStatus(),
                profileQueryRepository.findCategory(club.getCategoryId()),
                profileQueryRepository.findTags(club.getId()),
                profileQueryRepository.findPublishedRounds(club.getId())
        );
    }

    // ตรวจข้อมูลทั้งหมดก่อนนำไปบันทึก
    public void validateUpdateRequest(ClubUpdateRequestDto request) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (request == null) {
            throw new ClubValidationException(
                    Map.of("request", "Request body is required")
            );
        }

        // ใช้ annotation ใน DTO ตรวจข้อมูล
        for (var violation : validator.validate(request)) {
            errors.putIfAbsent(
                    violation.getPropertyPath().toString(),
                    violation.getMessage()
            );
        }

        validateHttpsUrl("contactUrl", request.contactUrl(), errors);
        validateHttpsUrl("imageUrl", request.imageUrl(), errors);
        validateHttpsUrl("bannerUrl", request.bannerUrl(), errors);

        validateSocialUrl(
                "facebookUrl",
                request.facebookUrl(),
                Set.of(
                        "facebook.com",
                        "www.facebook.com",
                        "m.facebook.com"
                ),
                errors
        );

        validateSocialUrl(
                "instagramUrl",
                request.instagramUrl(),
                Set.of(
                        "instagram.com",
                        "www.instagram.com"
                ),
                errors
        );

        validateCategoryId(request.categoryId(), errors);
        validateTagIds(request.tagIds(), errors);

        if (!errors.isEmpty()) {
            throw new ClubValidationException(errors);
        }
    }

    private static void validateCategoryId(String value, Map<String, String> errors) {
        if (value == null) {
            errors.put("categoryId", "Category is required");
        } else if (!isPositiveId(value)) {
            errors.put("categoryId", "Must be a positive decimal identifier");
        }
    }

    private static void validateTagIds(List<String> values, Map<String, String> errors) {
        if (values == null) {
            errors.put("tagIds", "Tags are required");
            return;
        }
        if (values.size() > MAX_TAGS) {
            errors.put("tagIds", "At most " + MAX_TAGS + " tags are allowed");
            return;
        }

        Set<Long> seen = new HashSet<>();
        for (int i = 0; i < values.size(); i++) {
            String value = values.get(i);
            if (value == null || !isPositiveId(value)) {
                errors.put("tagIds[" + i + "]", "Must be a positive decimal identifier");
            } else if (!seen.add(Long.valueOf(value))) {
                errors.put("tagIds[" + i + "]", "Duplicate tag id");
            }
        }
    }

    // ตัวเลขฐานสิบบวก ไม่มีเลขศูนย์นำหน้า และไม่เกินขนาด Long (ตาม PositiveBigintId)
    private static boolean isPositiveId(String value) {
        if (!value.matches("[1-9][0-9]{0,18}")) {
            return false;
        }
        try {
            Long.parseLong(value);
            return true;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private URI validateHttpsUrl(
            String field,
            String value,
            Map<String, String> errors
    ) {
        // ฟิลด์ไม่บังคับสามารถเป็น null ได้
        if (value == null) {
            return null;
        }

        if (value.isBlank()) {
            errors.put(field, "Use null instead of an empty URL");
            return null;
        }

        try {
            URI uri = new URI(value);

            boolean valid =
                    "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && !uri.getHost().isBlank()
                    && uri.getRawUserInfo() == null
                    && (uri.getPort() == -1
                        || (uri.getPort() >= 1
                            && uri.getPort() <= 65535));

            if (!valid) {
                errors.put(
                        field,
                        "Must be a valid HTTPS URL without credentials"
                );
                return null;
            }

            return uri;

        } catch (URISyntaxException exception) {
            errors.put(field, "Invalid URL format");
            return null;
        }
    }

    private void validateSocialUrl(
            String field,
            String value,
            Set<String> allowedHosts,
            Map<String, String> errors
    ) {
        URI uri = validateHttpsUrl(field, value, errors);

        if (uri == null) {
            return;
        }

        String host = uri.getHost().toLowerCase(Locale.ROOT);

        if (!allowedHosts.contains(host)) {
            errors.put(
                    field,
                    "URL must belong to the correct social platform"
            );
            return;
        }

        if (uri.getPort() != -1 && uri.getPort() != 443) {
            errors.put(
                    field,
                    "Social media URL must use the default HTTPS port"
            );
        }
    }

    public static class ClubNotFoundException extends RuntimeException {

        public ClubNotFoundException() {
            super("Club not found");
        }
    }

    public static class ClubValidationException extends RuntimeException {

        private final Map<String, String> fieldErrors;

        public ClubValidationException(Map<String, String> fieldErrors) {
            super("Club profile validation failed");
            // Keep insertion order so fieldErrors are returned in a stable order.
            this.fieldErrors = Collections.unmodifiableMap(new LinkedHashMap<>(fieldErrors));
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}