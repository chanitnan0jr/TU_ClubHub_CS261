package com.tu.clubhub.club.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.validation.Validator;

import org.springframework.stereotype.Service;

import com.tu.clubhub.club.dto.ClubUpdateRequestDto;

@Service
public class ClubService {

    private final Validator validator;

    public ClubService(Validator validator) {
        this.validator = validator;
    }

    // ตรวจข้อมูลทั้งหมดก่อนนำไปบันทึก
    public void validateUpdateRequest(ClubUpdateRequestDto request) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (request == null) {
            throw new ClubValidationException(
                    Map.of("request", "Request body is required")
            );
        }

        // ใช้ annotation ใน DTO ตรวจชื่อ คำอธิบาย อีเมล และความยาว
        for (var violation : validator.validate(request)) {
            errors.putIfAbsent(
                    violation.getPropertyPath().toString(),
                    violation.getMessage()
            );
        }

        // ตรวจ URL ให้มีโครงสร้างถูกต้องและใช้ HTTPS
        validateHttpsUrl("contactUrl", request.contactUrl(), errors);
        validateHttpsUrl("imageUrl", request.imageUrl(), errors);
        validateHttpsUrl("bannerUrl", request.bannerUrl(), errors);

        // ตรวจ HTTPS และโดเมนของ Social Media
        validateSocialUrl(
                "facebookUrl",
                request.facebookUrl(),
                Set.of("facebook.com", "www.facebook.com", "m.facebook.com"),
                errors
        );

        validateSocialUrl(
                "instagramUrl",
                request.instagramUrl(),
                Set.of("instagram.com", "www.instagram.com"),
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
        // ฟิลด์ไม่บังคับ: null หมายถึงไม่ได้ระบุ / ล้างค่าเดิม
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
                        || (uri.getPort() >= 1 && uri.getPort() <= 65535));

            if (!valid) {
                errors.put(field, "Must be a valid HTTPS URL without credentials");
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

        // เปรียบเทียบโดเมนจริง ไม่ใช้ contains()
        if (!allowedHosts.contains(host)) {
            errors.put(field, "URL must belong to the correct social platform");
            return;
        }

        // Social Media ใช้พอร์ตปกติของ HTTPS
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            errors.put(field, "Social media URL must use the default HTTPS port");
        }
    }

    // เก็บชื่อฟิลด์และข้อความผิดพลาดให้ชั้น API นำไปตอบกลับ
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