package com.tu.clubhub.application.dto;

import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

final class ApplicationRequestJson {
    private ApplicationRequestJson() {}

    static void object(JsonNode node, Set<String> allowed, String field) {
        if (node == null || !node.isObject()) {
            throw invalid(field, "Must be a JSON object.");
        }
        for (String name : node.propertyNames()) {
            if (!allowed.contains(name)) {
                throw invalid(field, "Contains an unsupported field.");
            }
        }
    }

    static String text(JsonNode node, String name, String field) {
        JsonNode value = node.get(name);
        if (value == null || !value.isTextual()) {
            throw invalid(field, "Must be a non-null JSON string.");
        }
        return value.asString();
    }

    static List<JsonNode> array(JsonNode node, String name) {
        JsonNode value = node.get(name);
        if (value == null || !value.isArray()) {
            throw invalid(name, "Must be a non-null JSON array.");
        }
        List<JsonNode> items = new ArrayList<>();
        value.forEach(items::add);
        return items;
    }

    private static ApplicationSubmissionException invalid(String field, String message) {
        return ApplicationSubmissionException.validation(List.of(new FieldError(field, "INVALID", message)));
    }
}
