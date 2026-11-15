package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Set;
import tools.jackson.databind.JsonNode;

public record PublishResultsRequest(long version) {
    public PublishResultsRequest {
        if (version < 0 || version == Long.MAX_VALUE) throw ApplicationDecisionRequest.invalid("version");
    }
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static PublishResultsRequest from(JsonNode node) {
        ApplicationRequestJson.object(node, Set.of("version"), "request");
        return new PublishResultsRequest(ApplicationDecisionRequest.version(node));
    }
}
