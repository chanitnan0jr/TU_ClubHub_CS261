package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Set;
import tools.jackson.databind.JsonNode;

public record ApplicationLinkInput(String label, String url) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ApplicationLinkInput fromJson(JsonNode node) {
        return fromJson(node, "links");
    }

    static ApplicationLinkInput fromJson(JsonNode node, String field) {
        ApplicationRequestJson.object(node, Set.of("label", "url"), field);
        return new ApplicationLinkInput(
                ApplicationRequestJson.text(node, "label", field + ".label"),
                ApplicationRequestJson.text(node, "url", field + ".url"));
    }
}
