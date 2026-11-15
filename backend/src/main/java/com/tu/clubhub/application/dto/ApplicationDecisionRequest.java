package com.tu.clubhub.application.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Strict JSON contract: identity, timestamps and publication are always server owned. */
public record ApplicationDecisionRequest(String decision, String resultMessage, String internalNote, long version) {
    public ApplicationDecisionRequest {
        if (decision == null || !Set.of("ACCEPTED", "REJECTED").contains(decision)) throw invalid("decision");
        if (version < 0 || version == Long.MAX_VALUE) throw invalid("version");
        checkText(resultMessage, "resultMessage", 1000);
        checkText(internalNote, "internalNote", 2000);
    }
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static ApplicationDecisionRequest from(JsonNode node) {
        ApplicationRequestJson.object(node, Set.of("decision", "resultMessage", "internalNote", "version"), "request");
        return fields(node);
    }

    static ApplicationDecisionRequest fields(JsonNode node) {
        String decision = ApplicationRequestJson.text(node, "decision", "decision");
        if (!Set.of("ACCEPTED", "REJECTED").contains(decision)) throw invalid("decision");
        return new ApplicationDecisionRequest(decision, optional(node, "resultMessage", 1000),
                optional(node, "internalNote", 2000), version(node));
    }

    static long version(JsonNode node) {
        JsonNode value = node.get("version");
        try {
            if (value == null || !value.isIntegralNumber()) throw new IllegalArgumentException();
            long result = Long.parseLong(value.toString());
            if (result < 0 || result == Long.MAX_VALUE) throw new IllegalArgumentException();
            return result;
        } catch (IllegalArgumentException e) { throw invalid("version"); }
    }

    private static String optional(JsonNode node, String field, int max) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isTextual()) throw invalid(field);
        String text = value.asString();
        checkText(text, field, max);
        return text;
    }

    private static void checkText(String text, String field, int max) {
        if (text != null && (text.codePointCount(0, text.length()) > max || text.indexOf('\0') >= 0)) throw invalid(field);
    }

    static ApplicationSubmissionException invalid(String field) {
        return ApplicationSubmissionException.validation(List.of(new FieldError(field, "INVALID", "Invalid decision field.")));
    }
}
