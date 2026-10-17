package com.tu.clubhub.club.controller;

import java.beans.PropertyEditorSupport;

import com.tu.clubhub.club.dto.ClubResponseDto;
import com.tu.clubhub.club.dto.ClubUpdateRequestDto;
import com.tu.clubhub.club.service.ClubService;
import com.tu.clubhub.committee.security.RequireClubCommittee;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clubs")
public class ClubController {

    private final ClubService clubService;

    public ClubController(ClubService clubService) {
        this.clubService = clubService;
    }

    // ตรวจค่าก่อนนำไปใช้เป็นพารามิเตอร์ Long ของ Controller
    @InitBinder
    public void configureIdBinding(WebDataBinder binder) {
        binder.registerCustomEditor(
                Long.class,
                new PropertyEditorSupport() {
                    @Override
                    public void setAsText(String text) {
                        if (text == null || !text.matches("[0-9]+")) {
                            throw new IllegalArgumentException(
                                    "ID must contain decimal digits only"
                            );
                        }

                        // เลขเกินขนาด Long จะถูกปฏิเสธเช่นกัน
                        setValue(Long.valueOf(text));
                    }
                }
        );
    }

    @PutMapping("/{clubId}")
    @RequireClubCommittee
    public ResponseEntity<ClubResponseDto> updateClub(
            @PathVariable("clubId") Long clubId,
            @RequestBody ClubUpdateRequestDto request
    ) {
        ClubResponseDto response = clubService.updateClub(
                clubId,
                request
        );

        return ResponseEntity.ok(response);
    }
}