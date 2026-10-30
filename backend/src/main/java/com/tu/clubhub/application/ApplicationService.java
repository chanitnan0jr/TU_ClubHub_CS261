package com.tu.clubhub.application;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    /**
     * ดึงรายการใบสมัครเฉพาะของ userId ที่ระบุเท่านั้น (Privacy Isolation)
     */
    public List<ApplicationResponseDto> getApplicationsByUserId(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID is required");
        }

        return applicationRepository.findByUserIdOrderBySubmittedAtDesc(userId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private ApplicationResponseDto mapToDto(ApplicationEntity entity) {
        return new ApplicationResponseDto(
                entity.getId(),
                entity.getClubId(),
                entity.getClubName(),
                entity.getAcademicYear(),
                entity.getStatus(),
                entity.getSubmittedAt(),
                entity.getReason(),
                entity.getPortfolioUrl(),
                entity.getNote(),
                entity.getInterviewDate()
        );
    }
}