package com.tu.clubhub.club.service;

import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ClubServiceTest {

    private static ValidatorFactory factory;
    private static ClubService service;

    @BeforeAll
    static void setup() {
        factory = Validation.buildDefaultValidatorFactory();
        service = new ClubService(factory.getValidator());
    }

    @AfterAll
    static void cleanup() {
        factory.close();
    }

    // สร้างข้อมูลชมรมสำหรับใช้ทดสอบ
    private ClubUpdateRequestDto request(
            String imageUrl,
            String email,
            String facebookUrl) {

        return new ClubUpdateRequestDto(
                "Music Club",
                "A club for music lovers",
                null,
                null,
                facebookUrl,
                null,
                email,
                imageUrl,
                null
        );
    }

    @Test
    void validDataShouldPass() {
        var data = request(
                "https://example.com/logo.png",
                "club@tu.ac.th",
                "https://www.facebook.com/tuclub"
        );

        assertDoesNotThrow(
                () -> service.validateUpdateRequest(data)
        );
    }

    @Test
    void httpImageShouldFail() {
        var data = request(
                "http://example.com/logo.png",
                "club@tu.ac.th",
                null
        );

        var error = assertThrows(
                ClubValidationException.class,
                () -> service.validateUpdateRequest(data)
        );

        assertTrue(error.getFieldErrors().containsKey("imageUrl"));
    }

    @Test
    void invalidEmailShouldFail() {
        var data = request(
                null,
                "club@",
                null
        );

        var error = assertThrows(
                ClubValidationException.class,
                () -> service.validateUpdateRequest(data)
        );

        assertTrue(error.getFieldErrors().containsKey("contactEmail"));
    }

    @Test
    void wrongFacebookDomainShouldFail() {
        var data = request(
                null,
                "club@tu.ac.th",
                "https://instagram.com/tuclub"
        );

        var error = assertThrows(
                ClubValidationException.class,
                () -> service.validateUpdateRequest(data)
        );

        assertTrue(error.getFieldErrors().containsKey("facebookUrl"));
    }

    @Test
    void fakeFacebookDomainShouldFail() {
        var data = request(
                null,
                null,
                "https://facebook.com.fake.com/tuclub"
        );

        var error = assertThrows(
                ClubValidationException.class,
                () -> service.validateUpdateRequest(data)
        );

        assertTrue(error.getFieldErrors().containsKey("facebookUrl"));
    }

    @Test
    void optionalFieldsCanBeNull() {
        var data = request(null, null, null);

        assertDoesNotThrow(
                () -> service.validateUpdateRequest(data)
        );
    }
}