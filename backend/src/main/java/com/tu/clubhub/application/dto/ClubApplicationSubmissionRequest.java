package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Task52 selects a round explicitly; applicant identity and state remain server-owned. */
public record ClubApplicationSubmissionRequest(String roundId, String motivation,
        List<ApplicationAnswerInput> answers, List<ApplicationLinkInput> links) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ClubApplicationSubmissionRequest fromJson(JsonNode node) {
        ApplicationRequestJson.object(node, Set.of("roundId", "motivation", "answers", "links"), "request");
        String roundId = ApplicationRequestJson.text(node, "roundId", "roundId");
        var content = ApplicationSubmissionRequest.readContent(node);
        return new ClubApplicationSubmissionRequest(roundId, content.motivation(), content.answers(), content.links());
    }

    public ApplicationSubmissionRequest submission() {
        return new ApplicationSubmissionRequest(motivation, answers, links);
    }
}
