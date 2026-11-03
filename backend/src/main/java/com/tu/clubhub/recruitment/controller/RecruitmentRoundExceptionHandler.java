package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.common.error.ApiExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Retains the existing scoped advice/test imports; all framework mapping is shared. */
@RestControllerAdvice(assignableTypes = {RecruitmentRoundController.class, ApplicationQuestionController.class})
@Order(0)
public class RecruitmentRoundExceptionHandler extends ApiExceptionHandler {}
