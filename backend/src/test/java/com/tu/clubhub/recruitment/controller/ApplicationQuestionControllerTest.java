package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.recruitment.service.ApplicationQuestionService;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionListView;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** HTTP contract tests only. Security/CSRF require separate Spring integration tests. */
class ApplicationQuestionControllerTest {
    private static final String BASE = "/api/v1/rounds/10/questions";

    private MockMvc mvc;
    private ApplicationQuestionService service;

    @BeforeEach
    void setUp() {
        service = mock(ApplicationQuestionService.class);
        mvc = MockMvcBuilders.standaloneSetup(new ApplicationQuestionController(service)).build();
    }

    @Test
    void getReturnsOrderedQuestionList() throws Exception {
        when(service.listQuestions(10L)).thenReturn(new QuestionListView(List.of(
                new QuestionView("40", "10", "Why join?", true, 1))));

        mvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("40"))
                .andExpect(jsonPath("$.items[0].questionText").value("Why join?"));
    }

    @Test
    void postReturns201BodyAndLocation() throws Exception {
        when(service.createQuestion(10L, "Why join?", true))
                .thenReturn(new QuestionView("40", "10", "Why join?", true, 1));

        mvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionText\":\"Why join?\",\"isRequired\":true}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith(BASE + "/40")))
                .andExpect(jsonPath("$.id").value("40"));
    }

    @Test
    void putReturnsUpdatedQuestion() throws Exception {
        when(service.updateQuestion(10L, 40L, "Updated", false))
                .thenReturn(new QuestionView("40", "10", "Updated", false, 1));

        mvc.perform(put(BASE + "/40")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionText\":\"Updated\",\"isRequired\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionText").value("Updated"))
                .andExpect(jsonPath("$.isRequired").value(false));
    }

    @Test
    void deleteReturns204NoContent() throws Exception {
        mvc.perform(delete(BASE + "/40"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).deleteQuestion(10L, 40L);
    }

    @Test
    void putOrderUsesIdsAsStringsAndReturnsNewOrder() throws Exception {
        when(service.reorderQuestions(10L, List.of(41L, 40L)))
                .thenReturn(new QuestionListView(List.of(
                        new QuestionView("41", "10", "Second", true, 1),
                        new QuestionView("40", "10", "First", true, 2))));

        mvc.perform(put(BASE + "/order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionIds\":[\"41\",\"40\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("41"))
                .andExpect(jsonPath("$.items[1].displayOrder").value(2));
    }

    @Test
    void overflowedQuestionIdReturns400RatherThan500() throws Exception {
        mvc.perform(put(BASE + "/order")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"questionIds\":[\"9223372036854775808\"]}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void serviceConflictIsExposedAs409() throws Exception {
        doThrow(new ResponseStatusException(CONFLICT, "Question has answers"))
                .when(service).deleteQuestion(10L, 40L);

        mvc.perform(delete(BASE + "/40"))
                .andExpect(status().isConflict());
    }
}
