package com.tu.clubhub.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getApplicationsByUserId_ShouldReturnUserApplicationsOnly() {
        String userId = "student-001";
        ApplicationEntity entity = new ApplicationEntity(
                "app-1", userId, "club-1", "TU Coding Club", "2567",
                "PENDING", LocalDateTime.now(), "Interest in coding",
                "https://portfolio.com", "Waiting for review", null
        );

        when(applicationRepository.findByUserIdOrderBySubmittedAtDesc(userId))
                .thenReturn(List.of(entity));

        List<ApplicationResponseDto> result = applicationService.getApplicationsByUserId(userId);

        assertEquals(1, result.size());
        assertEquals("TU Coding Club", result.get(0).getClubName());
        verify(applicationRepository, times(1)).findByUserIdOrderBySubmittedAtDesc(userId);
    }

    @Test
    void getApplicationsByUserId_ShouldThrowException_WhenUserIdIsEmpty() {
        assertThrows(IllegalArgumentException.class, () -> {
            applicationService.getApplicationsByUserId("");
        });
    }
}