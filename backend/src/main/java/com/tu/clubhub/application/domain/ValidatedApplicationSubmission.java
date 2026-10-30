package com.tu.clubhub.application.domain;

import java.util.List;

/** Immutable, normalized write values; not an API response or persistence entity. */
public record ValidatedApplicationSubmission(
        long roundId, String motivation, List<Answer> answers, List<Link> links) {
    public ValidatedApplicationSubmission {
        answers = List.copyOf(answers);
        links = List.copyOf(links);
    }
    public record Answer(long questionId, String text, int inputLength) {}
    public record Link(String label, String url) {}
}
