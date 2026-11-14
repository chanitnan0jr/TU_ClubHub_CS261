package com.tu.clubhub.application;

import com.tu.clubhub.application.dto.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class SelectionResultRequestTest {
    private final ObjectMapper json = new ObjectMapper();

    @Test void acceptsBothDecisionsUnicodeAndNullableNotes() {
        for (String decision : new String[]{"ACCEPTED", "REJECTED"}) {
            var request = json.readValue("{\"decision\":\"" + decision + "\",\"version\":0,\"resultMessage\":null}", ApplicationDecisionRequest.class);
            assertEquals(decision, request.decision()); assertNull(request.internalNote());
        }
        String note = "😀".repeat(2000);
        var request = json.readValue("{\"decision\":\"ACCEPTED\",\"version\":1,\"internalNote\":\"" + note + "\"}", ApplicationDecisionRequest.class);
        assertEquals(note, request.internalNote());
    }

    @ParameterizedTest @ValueSource(strings = {
            "{}", "[]", "{\"decision\":\"WAITLIST\",\"version\":0}",
            "{\"decision\":\"ACCEPTED\"}", "{\"decision\":\"ACCEPTED\",\"version\":null}",
            "{\"decision\":\"ACCEPTED\",\"version\":-1}", "{\"decision\":\"ACCEPTED\",\"version\":1.0}",
            "{\"decision\":\"ACCEPTED\",\"version\":\"1\"}", "{\"decision\":\"ACCEPTED\",\"version\":9223372036854775808}",
            "{\"decision\":\"ACCEPTED\",\"version\":0,\"decidedBy\":\"1\"}",
            "{\"decision\":\"ACCEPTED\",\"version\":0,\"decidedAt\":\"2026-01-01T00:00:00Z\"}",
            "{\"decision\":\"ACCEPTED\",\"version\":0,\"resultsPublishedAt\":null}",
            "{\"decision\":\"ACCEPTED\",\"version\":0,\"internalNote\":3}"
    }) void rejectsInvalidOrSystemOwnedDecisionFields(String body) {
        assertThrows(RuntimeException.class, () -> json.readValue(body, ApplicationDecisionRequest.class));
    }

    @Test void rejectsOversizedNotesAndNul() {
        for (String field : new String[]{"internalNote", "resultMessage"}) {
            int max = field.equals("internalNote") ? 2000 : 1000;
            assertThrows(RuntimeException.class, () -> json.readValue("{\"decision\":\"ACCEPTED\",\"version\":0,\"" + field + "\":\"" + "ก".repeat(max+1) + "\"}", ApplicationDecisionRequest.class));
            assertThrows(RuntimeException.class, () -> json.readValue("{\"decision\":\"ACCEPTED\",\"version\":0,\"" + field + "\":\"\\u0000\"}", ApplicationDecisionRequest.class));
        }
    }

    @ParameterizedTest @ValueSource(strings = {
            "{\"decisions\":[]}", "{\"decisions\":null}", "{\"decisions\":[{\"applicationId\":1,\"decision\":\"ACCEPTED\",\"version\":0}]}",
            "{\"decisions\":[{\"applicationId\":\"01\",\"decision\":\"ACCEPTED\",\"version\":0}]}",
            "{\"decisions\":[{\"applicationId\":\"1\",\"decision\":\"ACCEPTED\",\"version\":0},{\"applicationId\":\"1\",\"decision\":\"REJECTED\",\"version\":0}]}"
    }) void rejectsInvalidBatch(String body) {
        assertThrows(RuntimeException.class, () -> json.readValue(body, BatchApplicationDecisionRequest.class));
    }

    @Test void boundsBatchAndRejectsPublicationOverposting() {
        String item = "{\"applicationId\":\"%s\",\"decision\":\"ACCEPTED\",\"version\":0}";
        String tooMany = java.util.stream.LongStream.rangeClosed(1,101).mapToObj(i -> item.formatted(i)).collect(java.util.stream.Collectors.joining(","));
        assertThrows(RuntimeException.class, () -> json.readValue("{\"decisions\":[" + tooMany + "]}", BatchApplicationDecisionRequest.class));
        assertEquals(3, json.readValue("{\"version\":3}", PublishResultsRequest.class).version());
        assertThrows(RuntimeException.class, () -> json.readValue("{\"version\":0,\"publisherId\":\"1\"}", PublishResultsRequest.class));
    }
}
