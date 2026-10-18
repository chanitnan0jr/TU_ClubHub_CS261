package com.tu.clubhub.club.controller;

import com.tu.clubhub.club.dto.PublicClubProfileDto;
import com.tu.clubhub.club.dto.PublicRecruitmentRoundPageDto;
import com.tu.clubhub.club.service.PublicClubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/clubs")
public class PublicClubController {

    private final PublicClubService publicClubService;

    public PublicClubController(PublicClubService publicClubService) {
        this.publicClubService = publicClubService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicClubProfileDto> getClubProfile(
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(publicClubService.getClubProfile(id));
    }

    @GetMapping("/{id}/recruitment-rounds")
    public ResponseEntity<PublicRecruitmentRoundPageDto> getOpenRecruitmentRounds(
            @PathVariable("id") String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(publicClubService.getOpenRecruitmentRounds(id, page, size));
    }
}
