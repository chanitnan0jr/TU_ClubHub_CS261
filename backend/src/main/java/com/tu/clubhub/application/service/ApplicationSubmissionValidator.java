package com.tu.clubhub.application.service;

import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission.Answer;
import com.tu.clubhub.application.domain.ValidatedApplicationSubmission.Link;
import com.tu.clubhub.auth.dto.ProblemResponse.FieldError;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Component;

/** Stateless validation; question-specific lengths/requirements are checked under the round lock. */
@Component
public class ApplicationSubmissionValidator {
    public ValidatedApplicationSubmission validate(String rawRoundId, ApplicationSubmissionRequest request) {
        long roundId;
        try {
            roundId = positiveId(rawRoundId);
        } catch (IllegalArgumentException exception) {
            throw ApplicationSubmissionException.failure(400, "INVALID_RESOURCE_ID",
                    "roundId must be a positive decimal bigint without leading zeroes.");
        }
        List<FieldError> errors = new ArrayList<>();
        if (request == null) {
            throw ApplicationSubmissionException.validation(
                    List.of(error("request", "Request body is required.")));
        }
        String motivation = text(request.motivation(), 2000, "motivation", errors);
        List<Answer> answers = new ArrayList<>();
        if (request.answers() == null) {
            errors.add(error("answers", "A non-null array is required."));
        } else {
            var ids = new HashSet<Long>();
            for (int i = 0; i < request.answers().size(); i++) {
                String field = "answers[" + i + "]";
                var answer = request.answers().get(i);
                if (answer == null) {
                    errors.add(error(field, "An answer object is required."));
                    continue;
                }
                Long id = null;
                try {
                    id = positiveId(answer.questionId());
                    if (!ids.add(id)) errors.add(error(field + ".questionId", "Question IDs must be unique."));
                } catch (IllegalArgumentException exception) {
                    errors.add(error(field + ".questionId", "Must be a positive decimal bigint."));
                }
                String answerText = text(answer.answerText(), Integer.MAX_VALUE, field + ".answerText", errors);
                if (id != null && answerText != null) {
                    answers.add(new Answer(id, answerText, length(answer.answerText())));
                }
            }
        }
        List<Link> links = new ArrayList<>();
        if (request.links() == null) {
            errors.add(error("links", "A non-null array is required."));
        } else {
            if (request.links().size() > 5) errors.add(error("links", "At most five links are allowed."));
            for (int i = 0; i < request.links().size(); i++) {
                String field = "links[" + i + "]";
                var link = request.links().get(i);
                if (link == null) {
                    errors.add(error(field, "A link object is required."));
                    continue;
                }
                String label = text(link.label(), 200, field + ".label", errors);
                if (!httpsUrl(link.url())) errors.add(new FieldError(field + ".url", "INVALID_HTTPS_URL",
                        "Must be an absolute HTTPS URI with a host and no whitespace, controls or userinfo."));
                links.add(new Link(label, link.url()));
            }
        }
        if (!errors.isEmpty()) throw ApplicationSubmissionException.validation(errors);
        return new ValidatedApplicationSubmission(roundId, motivation, List.copyOf(answers), List.copyOf(links));
    }

    private static long positiveId(String raw) {
        if (raw == null || !raw.matches("[1-9][0-9]{0,18}")) throw new IllegalArgumentException();
        return Long.parseLong(raw);
    }

    private static String text(String value, int max, String field, List<FieldError> errors) {
        if (value == null || value.codePoints().allMatch(ApplicationSubmissionValidator::whitespace)) {
            errors.add(error(field, "A nonblank string is required."));
            return null;
        }
        if (length(value) > max) errors.add(error(field, "Text exceeds the allowed length."));
        int start = 0;
        int end = value.length();
        while (start < end && whitespace(value.codePointAt(start))) start += Character.charCount(value.codePointAt(start));
        while (end > start && whitespace(value.codePointBefore(end))) end -= Character.charCount(value.codePointBefore(end));
        return value.substring(start, end);
    }

    private static boolean httpsUrl(String value) {
        if (value == null || value.isEmpty() || length(value) > 2048
                || value.codePoints().anyMatch(c -> whitespace(c) || Character.isISOControl(c))) return false;
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && !uri.getHost().isEmpty() && uri.getRawUserInfo() == null;
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static boolean whitespace(int codePoint) {
        return Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint) || codePoint == 0x85;
    }

    private static int length(String value) { return value.codePointCount(0, value.length()); }
    private static FieldError error(String field, String message) { return new FieldError(field, "INVALID", message); }
}
