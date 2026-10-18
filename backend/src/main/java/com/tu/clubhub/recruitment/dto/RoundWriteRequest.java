package com.tu.clubhub.recruitment.dto;

import java.time.OffsetDateTime;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

/** Shared full body for POST and PUT; PUT version uses the Replace group. */
public record RoundWriteRequest(
    @NotBlank @Size(max = 200) String title,
    @NotNull @Min(1) @Max(32767) Integer academicYear,
    @NotNull @Min(1) @Max(32767) Integer semester,
    @NotBlank String description,
    String eligibilityText,
    @NotNull OffsetDateTime opensAt,
    @NotNull OffsetDateTime closesAt,
    @NotNull OffsetDateTime confirmationDeadline,
    OffsetDateTime resultsScheduledAt,
    @NotNull List<@NotNull @Valid QuestionInput> questions,
    @NotNull(groups = Replace.class) @Null(groups = Create.class)
    @PositiveOrZero Long version
) {
    public interface Create extends jakarta.validation.groups.Default {}
    public interface Replace extends jakarta.validation.groups.Default {}

    @AssertTrue(message = "opensAt must precede closesAt; deadline must follow closesAt; results schedule must be within [opensAt, deadline)")
    public boolean isTimelineValid() {
        if (opensAt == null || closesAt == null || confirmationDeadline == null) return true;
        return opensAt.isBefore(closesAt)
            && confirmationDeadline.isAfter(closesAt)
            && (resultsScheduledAt == null || (!resultsScheduledAt.isBefore(opensAt)
                && resultsScheduledAt.isBefore(confirmationDeadline)));
    }

    @AssertTrue(message = "questions.displayOrder must be unique")
    public boolean isQuestionOrderUnique() {
        if (questions == null) return true;
        return questions.stream().filter(java.util.Objects::nonNull)
            .map(QuestionInput::displayOrder).distinct().count()
            == questions.stream().filter(java.util.Objects::nonNull).count();
    }
}
