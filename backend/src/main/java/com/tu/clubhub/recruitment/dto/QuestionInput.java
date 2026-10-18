package com.tu.clubhub.recruitment.dto;
import jakarta.validation.constraints.*;
public record QuestionInput(
    @NotBlank String prompt,
    @NotNull Boolean required,
    @NotNull @Positive Integer displayOrder,
    @NotNull @Positive Integer maxLength
) {}
