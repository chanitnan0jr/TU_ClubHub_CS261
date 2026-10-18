package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.committee.security.RequireClubCommittee;
import com.tu.clubhub.recruitment.domain.RecruitmentRound;
import com.tu.clubhub.recruitment.dto.RoundPatchRequest;
import com.tu.clubhub.recruitment.dto.RoundWriteRequest;
import com.tu.clubhub.recruitment.service.RecruitmentRoundService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/clubs/{clubId}/rounds")
public class RecruitmentRoundController {

    private final RecruitmentRoundService service;

    public RecruitmentRoundController(
            RecruitmentRoundService service) {
        this.service = service;
    }

    @PostMapping
    @RequireClubCommittee
    public ResponseEntity<RecruitmentRound> createRound(
            @PathVariable("clubId") @Positive Long clubId,
            @RequestBody
            @Validated(RoundWriteRequest.Create.class)
            RoundWriteRequest request) {

        RecruitmentRound round =
                service.createRound(clubId, request);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{roundId}")
                .buildAndExpand(round.id())
                .toUri();

        return ResponseEntity.created(location).body(round);
    }

    @PutMapping("/{roundId}")
    @RequireClubCommittee
    public RecruitmentRound updateRound(
            @PathVariable("clubId") @Positive Long clubId,
            @PathVariable("roundId") @Positive Long roundId,
            @RequestBody
            @Validated(RoundWriteRequest.Replace.class)
            RoundWriteRequest request) {

        return service.updateRound(clubId, roundId, request);
    }

    @PatchMapping("/{roundId}")
    @RequireClubCommittee
    public RecruitmentRound changeRoundStatus(
            @PathVariable("clubId") @Positive Long clubId,
            @PathVariable("roundId") @Positive Long roundId,
            @Valid @RequestBody RoundPatchRequest request) {

        return switch (request.action()) {
            case PUBLISH -> service.publishRound(
                    clubId, roundId, request.version());

            case CLOSE -> service.closeRound(
                    clubId, roundId, request.version());

            case CANCEL -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "CANCEL is not supported by this endpoint yet");
        };
    }
}