package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import tools.jackson.databind.JsonNode;

/** Only applicant-authored content; identity, state and timestamps come from the server. */
public record ApplicationSubmissionRequest(
        String motivation, List<ApplicationAnswerInput> answers, List<ApplicationLinkInput> links) {

    // An explicit tree boundary prevents scalar coercion and unknown-field acceptance,
    // even if an application's global ObjectMapper allows them.
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ApplicationSubmissionRequest fromJson(JsonNode node) {
        ApplicationRequestJson.object(node, Set.of("motivation", "answers", "links"), "request");
        var answers = ApplicationRequestJson.array(node, "answers");
        var links = ApplicationRequestJson.array(node, "links");
        return new ApplicationSubmissionRequest(
                ApplicationRequestJson.text(node, "motivation", "motivation"),
                IntStream.range(0, answers.size()).mapToObj(i ->
                        ApplicationAnswerInput.fromJson(answers.get(i), "answers[" + i + "]")).toList(),
                IntStream.range(0, links.size()).mapToObj(i ->
                        ApplicationLinkInput.fromJson(links.get(i), "links[" + i + "]")).toList());
    }
}
