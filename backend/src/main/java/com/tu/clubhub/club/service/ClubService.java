package com.tu.clubhub.club.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.validation.Validator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.ClubResponseDto;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;

@Service
public class ClubService {

    private final Validator validator;
    private final ClubRepository clubRepository;
    private final ClubProfileQueryRepository profileQueryRepository;

    public ClubService(
            Validator validator,
            ClubRepository clubRepository,
            ClubProfileQueryRepository profileQueryRepository
    ) {
        this.validator = validator;
        this.clubRepository = clubRepository;
        this.profileQueryRepository = profileQueryRepository;
    }

    // ตรวจข้อมูล แก้ไข และบันทึกชมรม
    @Transactional
    public ClubResponseDto updateClub(
            Long clubId,
            ClubUpdateRequestDto request
    ) {
        validateUpdateRequest(request);

        Club club = clubRepository.findById(clubId)
                .orElseThrow(ClubNotFoundException::new);

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

        return toResponse(savedClub);
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

        if (!errors.isEmpty()) {
            throw new ClubValidationException(errors);
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
            this.fieldErrors = Map.copyOf(fieldErrors);
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}