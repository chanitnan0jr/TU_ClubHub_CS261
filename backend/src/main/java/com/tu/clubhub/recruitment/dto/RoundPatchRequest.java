package com.tu.clubhub.recruitment.dto;
import jakarta.validation.constraints.*;
public record RoundPatchRequest(
    @NotNull @PositiveOrZero Long version,
    @NotNull Action action
) {
    public enum Action { PUBLISH, CLOSE, CANCEL }
}
