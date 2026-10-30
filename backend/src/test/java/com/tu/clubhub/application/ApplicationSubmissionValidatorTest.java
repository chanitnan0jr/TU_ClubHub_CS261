package com.tu.clubhub.application;

import com.tu.clubhub.application.dto.ApplicationAnswerInput;
import com.tu.clubhub.application.dto.ApplicationLinkInput;
import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.application.service.ApplicationSubmissionValidator;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;

class ApplicationSubmissionValidatorTest {
    private final ApplicationSubmissionValidator validator = new ApplicationSubmissionValidator();
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void trimsTextPreservesUrlsAndCountsUnicodeBeforeTrimming() {
        String url = "HTTPS://example.org/resume?q=one#section";
        var result = validator.validate("9223372036854775807", new ApplicationSubmissionRequest(
                "\u00a0กิจกรรม 😀\u00a0", List.of(new ApplicationAnswerInput("2", " 😀 ")),
                List.of(new ApplicationLinkInput(" Portfolio ", url))));
        assertEquals(Long.MAX_VALUE, result.roundId());
        assertEquals("กิจกรรม 😀", result.motivation());
        assertEquals("😀", result.answers().getFirst().text());
        assertEquals(3, result.answers().getFirst().inputLength());
        assertEquals("Portfolio", result.links().getFirst().label());
        assertEquals(url, result.links().getFirst().url());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"0", "-1", "01", "abc", "1.5", "9223372036854775808", "12345678901234567890"})
    void rejectsInvalidRoundIds(String id) {
        var error = assertThrows(ApplicationSubmissionException.class, () -> validator.validate(id, valid()));
        assertEquals(400, error.status());
        assertEquals("INVALID_RESOURCE_ID", error.code());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "\t\r\n", "\u00a0\u0085\u2003"})
    void rejectsBlankMotivation(String motivation) {
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest(motivation, List.of(), List.of())));
    }

    @Test
    void enforcesLimitsBeforeTrimmingAndAllowsEmptyArrays() {
        assertEquals(2000, validator.validate("1", new ApplicationSubmissionRequest(
                "😀".repeat(2000), List.of(), List.of())).motivation().codePointCount(0, 4000));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest(
                " " + "x".repeat(2000), List.of(), List.of())));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(),
                java.util.Collections.nCopies(6, new ApplicationLinkInput("Portfolio", "https://example.org")))));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(),
                List.of(new ApplicationLinkInput("x".repeat(201), "https://example.org")))));
        assertTrue(validator.validate("1", valid()).links().isEmpty());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "http://example.org", "ftp://example.org/file", "https-example.com",
            "httpsx://example.org", "https:///file", "https://",
            "https://user:password@example.org/file", "https://example.org/a b", "https://example.org/\nfile",
            "https://example.org/\u00a0file", "javascript:alert(1)", "/relative"})
    void rejectsInvalidOptionalUrlsWhenLinkIsPresent(String url) {
        var error = validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(),
                List.of(new ApplicationLinkInput("Portfolio", url)))));
        assertTrue(error.fieldErrors().stream().anyMatch(field -> field.field().equals("links[0].url")));
    }

    @Test
    void invalidHttpsUrlUsesTheOpenApiExampleFieldCode() {
        var error = validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(),
                List.of(new ApplicationLinkInput("Portfolio", "http://example.org")))));
        assertEquals("links[0].url", error.fieldErrors().getFirst().field());
        assertEquals("INVALID_HTTPS_URL", error.fieldErrors().getFirst().code());
    }

    @Test
    void rejectsNullArraysItemsDuplicateQuestionsAndInvalidQuestionIds() {
        validation(() -> validator.validate("1", null));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", null, List.of())));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(), null)));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello",
                java.util.Collections.singletonList(null), List.of())));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(),
                java.util.Collections.singletonList(null))));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello", List.of(
                new ApplicationAnswerInput("2", "a"), new ApplicationAnswerInput("2", "b")), List.of())));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello",
                List.of(new ApplicationAnswerInput("01", "answer")), List.of())));
        validation(() -> validator.validate("1", new ApplicationSubmissionRequest("hello",
                List.of(new ApplicationAnswerInput("2", "\u00a0\t")), List.of())));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "\t\n", "\u00a0\u0085\u2003"})
    void rejectsNullEmptyOrWhitespaceAnswerText(String answer) {
        var error = validation(() -> validator.validate("1", new ApplicationSubmissionRequest("Volunteer",
                List.of(new ApplicationAnswerInput("2", answer)), List.of())));
        assertTrue(error.fieldErrors().stream().anyMatch(field -> field.field().equals("answers[0].answerText")));
    }

    @Test
    void jsonDtoAcceptsOnlyContractFieldsAndTypesEvenWithPermissiveGlobalMapper() {
        var permissive = JsonMapper.builder()
                .disable(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
        var parsed = permissive.readValue("""
                {"motivation":"hello","answers":[{"questionId":"2","answerText":"answer"}],"links":[]}
                """, ApplicationSubmissionRequest.class);
        assertEquals("2", parsed.answers().getFirst().questionId());
        for (String json : List.of(
                "{\"motivation\":\"hello\",\"answers\":[],\"links\":[],\"applicantId\":\"999\"}",
                "{\"motivation\":123,\"answers\":[],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":{},\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[],\"links\":null}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":2,\"answerText\":\"a\"}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":\"2\",\"answerText\":42}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":\"2\",\"answerText\":[]}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":\"2\",\"answerText\":{}}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":\"2\",\"answerText\":null}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[{\"questionId\":\"2\",\"answerText\":[],\"optionId\":\"3\"}],\"links\":[]}",
                "{\"motivation\":\"hello\",\"answers\":[],\"links\":[{\"label\":\"x\",\"url\":\"https://example.org\",\"displayOrder\":1}]}",
                "{\"motivation\":\"hello\",\"answers\":[null],\"links\":[]}")) {
            Exception error = assertThrows(Exception.class,
                    () -> permissive.readValue(json, ApplicationSubmissionRequest.class), json);
            Throwable root = error;
            while (root.getCause() != null) root = root.getCause();
            assertInstanceOf(ApplicationSubmissionException.class, root, json);
            assertEquals("VALIDATION_FAILED", ((ApplicationSubmissionException) root).code());
        }
        assertEquals("hello", mapper.readValue(mapper.writeValueAsString(parsed),
                ApplicationSubmissionRequest.class).motivation());
    }

    private static ApplicationSubmissionRequest valid() {
        return new ApplicationSubmissionRequest("hello", List.of(), List.of());
    }

    private static ApplicationSubmissionException validation(org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(ApplicationSubmissionException.class, action);
        assertEquals(400, error.status());
        assertEquals("VALIDATION_FAILED", error.code());
        assertFalse(error.fieldErrors().isEmpty());
        return error;
    }
}
