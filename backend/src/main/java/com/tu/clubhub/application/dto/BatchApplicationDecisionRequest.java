package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

public record BatchApplicationDecisionRequest(List<Item> decisions) {
    public BatchApplicationDecisionRequest { decisions = List.copyOf(decisions); }
    public record Item(String applicationId, ApplicationDecisionRequest decision) {}

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static BatchApplicationDecisionRequest from(JsonNode node) {
        ApplicationRequestJson.object(node, Set.of("decisions"), "request");
        var values = ApplicationRequestJson.array(node, "decisions");
        if (values.isEmpty() || values.size() > 100) throw ApplicationDecisionRequest.invalid("decisions");
        Set<String> ids = new HashSet<>();
        var items = values.stream().map(value -> {
            ApplicationRequestJson.object(value, Set.of("applicationId", "decision", "resultMessage", "internalNote", "version"), "decisions");
            String id = ApplicationRequestJson.text(value, "applicationId", "applicationId");
            try {
                if (!id.matches("[1-9][0-9]{0,18}") || Long.parseLong(id) <= 0 || !ids.add(id))
                    throw new IllegalArgumentException();
            } catch (IllegalArgumentException e) { throw ApplicationDecisionRequest.invalid("applicationId"); }
            return new Item(id, ApplicationDecisionRequest.fields(value));
        }).toList();
        return new BatchApplicationDecisionRequest(items);
    }
}
