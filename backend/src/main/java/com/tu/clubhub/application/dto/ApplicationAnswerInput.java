package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Set;
import tools.jackson.databind.JsonNode;

public record ApplicationAnswerInput(String questionId, String answerText) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ApplicationAnswerInput fromJson(JsonNode node) {
        return fromJson(node, "answers");
    }

    static ApplicationAnswerInput fromJson(JsonNode node, String field) {
        ApplicationRequestJson.object(node, Set.of("questionId", "answerText"), field);
        return new ApplicationAnswerInput(
                ApplicationRequestJson.text(node, "questionId", field + ".questionId"),
                ApplicationRequestJson.text(node, "answerText", field + ".answerText"));
    }
}
