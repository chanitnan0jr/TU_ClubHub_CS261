package com.tu.clubhub.common.error;

import com.tu.clubhub.auth.dto.ProblemResponse;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.webmvc.autoconfigure.error.BasicErrorController;
import org.springframework.boot.webmvc.error.ErrorAttributes;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;
import tools.jackson.databind.ObjectMapper;

/** Servlet ERROR dispatches use the API contract even when the caller requests HTML. */
@Controller
@RequestMapping("${server.error.path:${error.path:/error}}")
public class ApiFallbackErrorController extends BasicErrorController {
    private final ObjectMapper mapper;

    public ApiFallbackErrorController(ErrorAttributes attributes, WebProperties properties, ObjectMapper mapper) {
        super(attributes, properties.getError());
        this.mapper = mapper;
    }

    @Override @RequestMapping
    public ResponseEntity<Map<String, Object>> error(HttpServletRequest request) {
        if (!isApi(request)) return super.error(request);
        var body = fallback(request);
        return ResponseEntity.status(body.getStatus()).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .cacheControl(CacheControl.noStore()).body(body.asMap());
    }

    @Override @RequestMapping(produces = MediaType.TEXT_HTML_VALUE)
    public ModelAndView errorHtml(HttpServletRequest request, HttpServletResponse response) {
        if (!isApi(request)) return super.errorHtml(request, response);
        var body = fallback(request);
        response.setStatus(body.getStatus());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        try { mapper.writeValue(response.getOutputStream(), body); }
        catch (IOException exception) { throw new java.io.UncheckedIOException(exception); }
        return null;
    }

    private static boolean isApi(HttpServletRequest request) {
        return originalPath(request).startsWith("/api/");
    }

    private static String originalPath(HttpServletRequest request) {
        Object path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        return path instanceof String text ? text : request.getRequestURI();
    }

    private ProblemResponse fallback(HttpServletRequest request) {
        int status = getStatus(request).value();
        if (status < 400) status = 500;
        String code = ProblemResponse.codeFor(status);
        var body = new ProblemResponse(null, null, status, null, originalPath(request), code,
                UUID.randomUUID().toString(), List.of());
        if (status >= 500 && request.getAttribute(RequestDispatcher.ERROR_EXCEPTION) instanceof Throwable failure)
            ApiExceptionHandler.logFailure(failure, request, (String) body.getProperties().get("traceId"));
        return body;
    }
}
