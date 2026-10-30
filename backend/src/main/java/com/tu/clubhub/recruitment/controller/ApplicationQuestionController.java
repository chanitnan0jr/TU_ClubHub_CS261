package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.recruitment.service.ApplicationQuestionService;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionListView;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Committee-facing endpoints for questions attached to a recruitment round.
 *
 * The service resolves the round's owning club from the database and checks
 * committee authorization plus the self-review restriction. The existing
 * CSRF security filter protects POST, PUT and DELETE requests.
 */
@RestController
@RequestMapping("/api/v1/rounds/{roundId}/questions")
public class ApplicationQuestionController {

    private final ApplicationQuestionService service;

    public ApplicationQuestionController(ApplicationQuestionService service) {
        this.service = service;
    }

    public record QuestionWriteRequest(
            @NotBlank String questionText,
            @NotNull Boolean isRequired) {
    }

    public record QuestionOrderRequest(
            @NotNull List<@NotNull @Pattern(regexp = "^[1-9][0-9]*$") String> questionIds) {
    }

    @GetMapping
    public QuestionListView listQuestions(
            @PathVariable("roundId") @Positive Long roundId) {
        return service.listQuestions(roundId);
    }

    @PostMapping
    public ResponseEntity<QuestionView> createQuestion(
            @PathVariable("roundId") @Positive Long roundId,
            @Valid @RequestBody QuestionWriteRequest request) {
        QuestionView created = service.createQuestion(
                roundId, request.questionText(), request.isRequired());

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{questionId}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{questionId}")
    public QuestionView updateQuestion(
            @PathVariable("roundId") @Positive Long roundId,
            @PathVariable("questionId") @Positive Long questionId,
            @Valid @RequestBody QuestionWriteRequest request) {
        return service.updateQuestion(
                roundId, questionId, request.questionText(), request.isRequired());
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable("roundId") @Positive Long roundId,
            @PathVariable("questionId") @Positive Long questionId) {
        service.deleteQuestion(roundId, questionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/order")
    public QuestionListView reorderQuestions(
            @PathVariable("roundId") @Positive Long roundId,
            @Valid @RequestBody QuestionOrderRequest request) {
        List<Long> ids = new ArrayList<>(request.questionIds().size());
        for (String id : request.questionIds()) {
            try {
                ids.add(Long.parseLong(id));
            } catch (NumberFormatException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "questionIds must contain valid positive BIGINT IDs");
            }
        }
        return service.reorderQuestions(roundId, ids);
    }
}
