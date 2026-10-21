package com.tu.clubhub.application.controller;

import com.tu.clubhub.application.dto.ApplicationSubmissionRequest;
import com.tu.clubhub.application.service.ApplicationService;
import java.lang.reflect.Type;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Preserves §11 account-before-body ordering; locked checks remain authoritative in submit(). */
@ControllerAdvice(assignableTypes = ApplicationController.class)
public class ApplicationRequestBodyAdvice extends RequestBodyAdviceAdapter {
    private final ApplicationService service;

    public ApplicationRequestBodyAdvice(ApplicationService service) { this.service = service; }

    @Override
    public boolean supports(MethodParameter parameter, Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType) {
        return parameter.getParameterType() == ApplicationSubmissionRequest.class;
    }

    @Override
    public HttpInputMessage beforeBodyRead(HttpInputMessage input, MethodParameter parameter, Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType) {
        service.requireActiveAccountForRequest();
        return input;
    }

    @Override
    public Object handleEmptyBody(Object body, HttpInputMessage input, MethodParameter parameter, Type targetType,
            Class<? extends HttpMessageConverter<?>> converterType) {
        service.requireActiveAccountForRequest();
        return body;
    }
}
