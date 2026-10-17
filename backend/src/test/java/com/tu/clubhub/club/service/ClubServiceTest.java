package com.tu.clubhub.club.service;

import java.util.List;
import java.util.Optional;

import com.tu.clubhub.club.domain.Club;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubCategoryDto;
import com.tu.clubhub.club.dto.ClubResponseDto.ClubTagDto;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.repository.ClubProfileQueryRepository;
import com.tu.clubhub.club.repository.ClubRepository;
import com.tu.clubhub.club.service.ClubService.ClubNotFoundException;
import com.tu.clubhub.club.service.ClubService.ClubValidationException;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ClubServiceTest {

    private static ValidatorFactory factory;

    private ClubRepository clubRepository;
    private ClubProfileQueryRepository profileQueryRepository;
    private ClubService service;

    @BeforeAll
    static void setupValidator() {
        factory = Validation.buildDefaultValidatorFactory();
    }

    @BeforeEach
    void setupService() {
        clubRepository = mock(ClubRepository.class);
        profileQueryRepository = mock(ClubProfileQueryRepository.class);

        service = new ClubService(
                factory.getValidator(),
                clubRepository,
                profileQueryRepository
        );
    }

    @AfterAll
    static void cleanup() {
        factory.close();
    }

    // สร้างข้อมูลสำหรับทดสอบ
    private ClubUpdateRequestDto request(
            String imageUrl,
            String email,
            String facebookUrl
    ) {
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
        var data = request(null, "club@", null);

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

    @Test
    void updateShouldSaveEditableFieldsAndReturnResponse() {
        var data = request(
                "https://example.com/logo.png",
                "club@tu.ac.th",
                "https://facebook.com/tuclub"
        );

        Club club = mock(Club.class);

        when(clubRepository.findById(41L))
                .thenReturn(Optional.of(club));
        when(clubRepository.save(club)).thenReturn(club);

        when(club.getId()).thenReturn(41L);
        when(club.getCategoryId()).thenReturn(1L);
        when(club.getName()).thenReturn(data.name());
        when(club.getDescription()).thenReturn(data.description());
        when(club.getContactEmail()).thenReturn(data.contactEmail());
        when(club.getFacebookUrl()).thenReturn(data.facebookUrl());
        when(club.getImageUrl()).thenReturn(data.imageUrl());
        when(club.getStatus()).thenReturn("ACTIVE");

        var category = new ClubCategoryDto("1", "Music");
        var tags = List.of(new ClubTagDto("2", "Band"));

        when(profileQueryRepository.findCategory(1L))
                .thenReturn(category);
        when(profileQueryRepository.findTags(41L))
                .thenReturn(tags);
        when(profileQueryRepository.findPublishedRounds(41L))
                .thenReturn(List.of());

        var response = service.updateClub(41L, data);

        // ตั้งค่าครบทุกฟิลด์ที่อนุญาต รวมถึง null เพื่อล้างค่าเดิม
        verify(club).setName(data.name());
        verify(club).setDescription(data.description());
        verify(club).setObjectives(data.objectives());
        verify(club).setContactUrl(data.contactUrl());
        verify(club).setFacebookUrl(data.facebookUrl());
        verify(club).setInstagramUrl(data.instagramUrl());
        verify(club).setContactEmail(data.contactEmail());
        verify(club).setImageUrl(data.imageUrl());
        verify(club).setBannerUrl(data.bannerUrl());

        // ไม่แก้ฟิลด์ที่ API ไม่อนุญาต
        verify(club, never()).setCategoryId(any());
        verify(club, never()).setStatus(any());
        verify(club, never()).setAffiliationLevel(any());
        verify(club, never()).setAffiliationName(any());

        verify(clubRepository).save(club);

        // ตรวจข้อมูลที่ประกอบเป็น Response
        assertEquals("41", response.id());
        assertEquals("1", response.categoryId());
        assertEquals(data.name(), response.name());
        assertEquals(data.description(), response.description());
        assertEquals(data.contactEmail(), response.contactEmail());
        assertEquals(data.facebookUrl(), response.facebookUrl());
        assertEquals(data.imageUrl(), response.imageUrl());
        assertEquals("ACTIVE", response.status());
        assertEquals(category, response.category());
        assertEquals(tags, response.tags());
        assertTrue(response.recruitmentRounds().isEmpty());
    }

    @Test
    void invalidUpdateShouldNotAccessRepository() {
        var data = request(
                "http://example.com/logo.png",
                "club@tu.ac.th",
                null
        );

        assertThrows(
                ClubValidationException.class,
                () -> service.updateClub(41L, data)
        );

        // ข้อมูลผิดต้องหยุดก่อนค้นหาหรือบันทึก
        verifyNoInteractions(clubRepository, profileQueryRepository);
    }

    @Test
    void missingClubShouldNotSave() {
        var data = request(null, null, null);

        when(clubRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThrows(
                ClubNotFoundException.class,
                () -> service.updateClub(999L, data)
        );

        verify(clubRepository, never()).save(any(Club.class));
        verifyNoInteractions(profileQueryRepository);
    }
}