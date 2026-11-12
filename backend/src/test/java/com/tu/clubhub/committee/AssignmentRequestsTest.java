package com.tu.clubhub.committee;

import com.tu.clubhub.committee.config.AssignmentConfiguration.Properties;
import com.tu.clubhub.committee.dto.AssignmentRequests.*;
import com.tu.clubhub.committee.service.AssignmentException;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class AssignmentRequestsTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @ParameterizedTest
    @ValueSource(strings = {"null", "-1", "1.0", "\"1\"", "true", "9223372036854775808", "[]", "{}"})
    void versionRequiresNonnegativeSigned64BitJsonInteger(String version) {
        var error = assertThrows(AssignmentException.class,
                () -> Revoke.fromJson(mapper.readTree("{\"version\":" + version + ",\"reason\":\"Test\"}")));
        assertEquals(400, error.status()); assertEquals("VALIDATION_FAILED", error.code());
        assertEquals("version", error.fields().getFirst().field());
    }

    @Test void versionsAndOptionalServerStartArePreservedWithoutCoercion() {
        assertEquals(Long.MAX_VALUE, Revoke.fromJson(mapper.readTree("{\"version\":9223372036854775807,\"reason\":\"Test\"}")).version());
        var create = Create.fromJson(mapper.readTree("""
                {"membershipId":"123","positionName":"Committee","permissionRole":"COMMITTEE",
                 "endsAt":"2026-11-09T16:00:00+07:00","reason":"Appointment"}
                """));
        assertNull(create.startsAt()); assertEquals(Instant.parse("2026-11-09T09:00:00Z"), create.endsAt());
        assertEquals("123", create.membershipId());
    }

    @ParameterizedTest @ValueSource(strings = {"2026-11-09T16:00:00", "2026-11-09T16:00:00.1234567Z", "0000-01-01T00:00:00Z", "+10000-01-01T00:00:00Z", "2026-02-30T00:00:00Z", "not-a-date"})
    void invalidDatesAreFieldErrors(String value) {
        var error = assertThrows(AssignmentException.class, () -> Replace.fromJson(mapper.readTree("""
                {"version":0,"positionName":"Committee","permissionRole":"COMMITTEE","endsAt":"%s","reason":"Test"}
                """.formatted(value))));
        assertEquals("endsAt", error.fields().getFirst().field());
    }

    @ParameterizedTest @ValueSource(strings = {"assignedBy", "revokedBy", "status", "assignmentReason", "userId", "replacesAssignmentId"})
    void systemOwnedFieldsCannotBeInjected(String key) {
        assertThrows(AssignmentException.class, () -> Revoke.fromJson(mapper.readTree(
                "{\"version\":0,\"reason\":\"Test\",\"" + key + "\":\"forged\"}")));
    }

    @Test void lockTimeoutIsBoundedAndExpressedInDatabaseMilliseconds() {
        assertEquals("2000ms", new Properties(Duration.ofSeconds(2)).databaseLockTimeout());
        for (Duration invalid : new Duration[] {null, Duration.ZERO, Duration.ofNanos(1), Duration.ofMillis(-1), Duration.ofDays(30)})
            assertThrows(IllegalArgumentException.class, () -> new Properties(invalid));
    }
}
