package com.tu.clubhub.committee.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.tu.clubhub.committee.service.AssignmentException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/** Strict request envelopes: no scalar coercion, actor, status or audit fields from clients. */
public final class AssignmentRequests {
    private AssignmentRequests() {}
    public interface Grant {
        String positionName(); String permissionRole(); Instant startsAt(); Instant endsAt(); String reason();
    }
    public record Create(String membershipId, String positionName, String permissionRole,
            Instant startsAt, Instant endsAt, String reason) implements Grant {
        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public static Create fromJson(JsonNode node) {
            object(node, Set.of("membershipId", "positionName", "permissionRole", "startsAt", "endsAt", "reason"));
            return new Create(text(node, "membershipId"), text(node, "positionName"), text(node, "permissionRole"),
                    date(node, "startsAt", true), date(node, "endsAt", false), text(node, "reason"));
        }
    }
    public record Replace(long version, String positionName, String permissionRole,
            Instant startsAt, Instant endsAt, String reason) implements Grant {
        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public static Replace fromJson(JsonNode node) {
            object(node, Set.of("version", "positionName", "permissionRole", "startsAt", "endsAt", "reason"));
            return new Replace(AssignmentRequests.version(node), text(node, "positionName"), text(node, "permissionRole"),
                    date(node, "startsAt", true), date(node, "endsAt", false), text(node, "reason"));
        }
    }
    public record Revoke(long version, String reason) {
        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public static Revoke fromJson(JsonNode node) {
            object(node, Set.of("version", "reason"));
            return new Revoke(AssignmentRequests.version(node), text(node, "reason"));
        }
    }
    private static void object(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject()) throw AssignmentException.invalid("request", "Must be a JSON object.");
        for (String key : node.propertyNames()) if (!allowed.contains(key))
            throw AssignmentException.invalid("request", "Contains an unsupported field.");
    }
    private static String text(JsonNode node, String field) {
        var value = node.get(field);
        if (value == null || !value.isTextual()) throw AssignmentException.invalid(field, "Must be a non-null JSON string.");
        return value.asString();
    }
    private static long version(JsonNode node) {
        var value = node.get("version");
        try {
            if (value == null || !value.isIntegralNumber()) throw new IllegalArgumentException();
            long version = Long.parseLong(value.toString());
            if (version < 0) throw new IllegalArgumentException();
            return version;
        } catch (IllegalArgumentException exception) {
            throw AssignmentException.invalid("version", "Must be a nonnegative signed 64-bit JSON integer.");
        }
    }
    private static Instant date(JsonNode node, String field, boolean optional) {
        var value = node.get(field);
        if (optional && (value == null || value.isNull())) return null;
        String input = text(node, field);
        try {
            if (!input.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?(?:Z|[+-]\\d{2}:\\d{2})"))
                throw new IllegalArgumentException();
            var instant = OffsetDateTime.parse(input).toInstant();
            if (instant.isBefore(Instant.parse("0001-01-01T00:00:00Z")) || !instant.isBefore(Instant.parse("+10000-01-01T00:00:00Z")))
                throw new IllegalArgumentException();
            return instant;
        } catch (DateTimeParseException | IllegalArgumentException exception) {
            throw AssignmentException.invalid(field, "Use an offset date-time in years 0001-9999 with at most six fractional digits.");
        }
    }
}
