package com.tu.clubhub.recruitment.controller;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionListView;
import com.tu.clubhub.recruitment.service.ApplicationQuestionService.QuestionView;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * QA Integration & E2E Verification Test Suite for Task29:U08-QA-1.
 *
 * Covers User Story US-08: จัดการคำถามคัดเลือกของรอบรับสมัคร (Application Question Management)
 * Maps to Acceptance Criteria AC-01 to AC-05, Business Rules BR-01 to BR-07, and Test Cases TC-08-01 to TC-08-07.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Task29:U08-QA-1 - Application Question Management QA Test Suite")
class ApplicationQuestionManagementQATest {

    private static final long ROUND_ID = 10L;
    private static final long QUESTION_ID_1 = 41L;
    private static final long QUESTION_ID_2 = 42L;
    private static final long QUESTION_ID_3 = 43L;
    private static final String BASE_URL = "/api/v1/rounds/" + ROUND_ID + "/questions";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApplicationQuestionService service;

    @MockitoBean
    private ClubSecurity clubSecurity;

    private UsernamePasswordAuthenticationToken committeeAuth() {
        var principal = new ClubHubPrincipal(100L, "committee-user", "USER");
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
    }

    private UsernamePasswordAuthenticationToken nonCommitteeAuth() {
        var principal = new ClubHubPrincipal(999L, "student-user", "USER");
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
    }

    // =========================================================================
    // TC-08-01: เพิ่ม แก้ไข ลบ คำถามข้อความในรอบที่แก้ไขได้ (DRAFT)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-01: เพิ่ม แก้ไข ลบ และเรียกดูคำถามข้อความในรอบที่แก้ไขได้ (AC-01, BR-01)")
    class TestCase08_01 {

        @Test
        @DisplayName("TC-08-01A: กรรมการชมรมเพิ่มคำถามข้อความใหม่สำเร็จ ได้รับ 201 Created พร้อม Location header")
        void committeeCanCreateQuestion() throws Exception {
            when(service.createQuestion(eq(ROUND_ID), eq("ทำไมถึงอยากเข้าร่วมชมรม?"), eq(true)))
                    .thenReturn(new QuestionView(Long.toString(QUESTION_ID_1), Long.toString(ROUND_ID),
                            "ทำไมถึงอยากเข้าร่วมชมรม?", true, 1));

            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "ทำไมถึงอยากเข้าร่วมชมรม?",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isCreated())
                    .andExpect(header().string("Location", endsWith(BASE_URL + "/" + QUESTION_ID_1)))
                    .andExpect(jsonPath("$.id").value(Long.toString(QUESTION_ID_1)))
                    .andExpect(jsonPath("$.roundId").value(Long.toString(ROUND_ID)))
                    .andExpect(jsonPath("$.questionText").value("ทำไมถึงอยากเข้าร่วมชมรม?"))
                    .andExpect(jsonPath("$.isRequired").value(true))
                    .andExpect(jsonPath("$.displayOrder").value(1));

            verify(service).createQuestion(ROUND_ID, "ทำไมถึงอยากเข้าร่วมชมรม?", true);
        }

        @Test
        @DisplayName("TC-08-01B: กรรมการชมรมแก้ไขข้อความคำถามและสถานะบังคับตอบสำเร็จ ได้รับ 200 OK")
        void committeeCanUpdateQuestion() throws Exception {
            when(service.updateQuestion(eq(ROUND_ID), eq(QUESTION_ID_1), eq("ข้อความคำถามใหม่ที่แก้ไขแล้ว"), eq(false)))
                    .thenReturn(new QuestionView(Long.toString(QUESTION_ID_1), Long.toString(ROUND_ID),
                            "ข้อความคำถามใหม่ที่แก้ไขแล้ว", false, 1));

            mockMvc.perform(put(BASE_URL + "/" + QUESTION_ID_1)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "ข้อความคำถามใหม่ที่แก้ไขแล้ว",
                                        "isRequired": false
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(Long.toString(QUESTION_ID_1)))
                    .andExpect(jsonPath("$.questionText").value("ข้อความคำถามใหม่ที่แก้ไขแล้ว"))
                    .andExpect(jsonPath("$.isRequired").value(false));

            verify(service).updateQuestion(ROUND_ID, QUESTION_ID_1, "ข้อความคำถามใหม่ที่แก้ไขแล้ว", false);
        }

        @Test
        @DisplayName("TC-08-01C: กรรมการชมรมลบคำถามที่ไม่มีคำตอบอ้างอิงสำเร็จ ได้รับ 204 No Content")
        void committeeCanDeleteQuestion() throws Exception {
            doNothing().when(service).deleteQuestion(ROUND_ID, QUESTION_ID_1);

            mockMvc.perform(delete(BASE_URL + "/" + QUESTION_ID_1)
                            .with(authentication(committeeAuth()))
                            .with(csrf()))
                    .andExpect(status().isNoContent())
                    .andExpect(content().string(""));

            verify(service).deleteQuestion(ROUND_ID, QUESTION_ID_1);
        }

        @Test
        @DisplayName("TC-08-01D: กรรมการชมรมเรียกดูรายการคำถามทั้งหมด ได้รับ 200 OK เรียงตามลำดับ")
        void committeeCanListQuestions() throws Exception {
            when(service.listQuestions(ROUND_ID)).thenReturn(new QuestionListView(List.of(
                    new QuestionView(Long.toString(QUESTION_ID_1), Long.toString(ROUND_ID), "คำถามข้อที่ 1", true, 1),
                    new QuestionView(Long.toString(QUESTION_ID_2), Long.toString(ROUND_ID), "คำถามข้อที่ 2", false, 2)
            )));

            mockMvc.perform(get(BASE_URL)
                            .with(authentication(committeeAuth())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items").isArray())
                    .andExpect(jsonPath("$.items.length()").value(2))
                    .andExpect(jsonPath("$.items[0].id").value(Long.toString(QUESTION_ID_1)))
                    .andExpect(jsonPath("$.items[0].displayOrder").value(1))
                    .andExpect(jsonPath("$.items[1].id").value(Long.toString(QUESTION_ID_2)))
                    .andExpect(jsonPath("$.items[1].displayOrder").value(2));

            verify(service).listQuestions(ROUND_ID);
        }
    }

    // =========================================================================
    // TC-08-02: ตรวจสอบความถูกต้องของข้อมูล (Validation & Constraints)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-02: ตรวจสอบความถูกต้องของข้อมูล (Validation & Constraints) (AC-02, BR-02, BR-03)")
    class TestCase08_02 {

        @Test
        @DisplayName("TC-08-02A: ข้อความคำถามว่างเปล่าหรือมีแต่ช่องว่าง ปฏิเสธด้วย 400 Bad Request")
        void blankQuestionTextIsRejected() throws Exception {
            // กรณีข้อความว่างเปล่า ""
            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            // กรณีมีแต่ช่องว่าง "   "
            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "     ",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(service);
        }

        @Test
        @DisplayName("TC-08-02B: ไม่ระบุฟิลด์ isRequired (null) ปฏิเสธด้วย 400 Bad Request")
        void nullIsRequiredIsRejected() throws Exception {
            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "มีประสบการณ์ทำงานมาก่อนหรือไม่?"
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(service);
        }

        @Test
        @DisplayName("TC-08-02C: รหัสรอบรับสมัคร หรือรหัสคำถามเป็น 0 หรือติดลบ ตอบกลับ 400 Bad Request")
        void negativeOrZeroIdsAreRejected() throws Exception {
            mockMvc.perform(get("/api/v1/rounds/-1/questions")
                            .with(authentication(committeeAuth())))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(delete("/api/v1/rounds/10/questions/-99")
                            .with(authentication(committeeAuth()))
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-08-02D: ส่ง JSON ผิดรูปแบบ (Malformed JSON) ตอบกลับ 400 Bad Request")
        void malformedJsonIsRejected() throws Exception {
            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{ invalid json"))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(service);
        }
    }

    // =========================================================================
    // TC-08-03: การจัดเรียงลำดับคำถามและการคง ID เดิม (Display Order & Reordering)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-03: การจัดเรียงลำดับคำถามและการคง ID เดิม (AC-03, BR-04)")
    class TestCase08_03 {

        @Test
        @DisplayName("TC-08-03A: จัดเรียงลำดับคำถามใหม่สำเร็จ ตอบกลับ 200 OK พร้อมลำดับใหม่")
        void committeeCanReorderQuestions() throws Exception {
            List<Long> newOrder = List.of(QUESTION_ID_3, QUESTION_ID_1, QUESTION_ID_2);
            when(service.reorderQuestions(eq(ROUND_ID), eq(newOrder)))
                    .thenReturn(new QuestionListView(List.of(
                            new QuestionView(Long.toString(QUESTION_ID_3), Long.toString(ROUND_ID), "คำถามที่สาม", true, 1),
                            new QuestionView(Long.toString(QUESTION_ID_1), Long.toString(ROUND_ID), "คำถามที่หนึ่ง", true, 2),
                            new QuestionView(Long.toString(QUESTION_ID_2), Long.toString(ROUND_ID), "คำถามที่สอง", false, 3)
                    )));

            mockMvc.perform(put(BASE_URL + "/order")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionIds": ["43", "41", "42"]
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items[0].id").value(Long.toString(QUESTION_ID_3)))
                    .andExpect(jsonPath("$.items[0].displayOrder").value(1))
                    .andExpect(jsonPath("$.items[1].id").value(Long.toString(QUESTION_ID_1)))
                    .andExpect(jsonPath("$.items[1].displayOrder").value(2))
                    .andExpect(jsonPath("$.items[2].id").value(Long.toString(QUESTION_ID_2)))
                    .andExpect(jsonPath("$.items[2].displayOrder").value(3));

            verify(service).reorderQuestions(ROUND_ID, newOrder);
        }
    }

    // =========================================================================
    // TC-08-04: ปฏิเสธชุดลำดับที่ผิดพลาด (Invalid Reordering Scenarios)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-04: ปฏิเสธชุดลำดับที่ผิดพลาด (AC-03, BR-07)")
    class TestCase08_04 {

        @Test
        @DisplayName("TC-08-04A: รายการ questionIds ซ้ำกัน หรือไม่ครบถ้วน ตอบกลับ 400 Bad Request")
        void invalidQuestionIdsListIsRejected() throws Exception {
            when(service.reorderQuestions(eq(ROUND_ID), anyList()))
                    .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "questionIds must list every question in this round exactly once"));

            mockMvc.perform(put(BASE_URL + "/order")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionIds": ["41", "41"]
                                    }
                                    """))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-08-04B: รายการ questionIds มี ID ที่ผิดรูปแบบ ไม่ใช่ตัวเลขบวก ตอบกลับ 400 Bad Request")
        void malformedQuestionIdInListIsRejected() throws Exception {
            mockMvc.perform(put(BASE_URL + "/order")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionIds": ["abc", "41"]
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(put(BASE_URL + "/order")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionIds": ["-1", "41"]
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(service);
        }
    }

    // =========================================================================
    // TC-08-05: ป้องกันการแก้ไข ลบ หรือจัดเรียงคำถามเมื่อมีใบสมัครแล้ว (Data Integrity & Lock)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-05: ป้องกันการแก้ไข ลบ หรือจัดเรียงเมื่อมีใบสมัครแล้ว (AC-04, BR-05, Policy)")
    class TestCase08_05 {

        @Test
        @DisplayName("TC-08-05A: ปฏิเสธการสร้างคำถามใหม่เมื่อรอบมีใบสมัครแล้ว ตอบกลับ 409 Conflict")
        void cannotCreateQuestionWhenRoundHasApplications() throws Exception {
            when(service.createQuestion(eq(ROUND_ID), anyString(), anyBoolean()))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                            "Rounds with applications cannot have questions edited"));

            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "คำถามใหม่",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("TC-08-05B: ปฏิเสธการแก้ไขคำถามเมื่อรอบมีใบสมัครแล้ว ตอบกลับ 409 Conflict")
        void cannotUpdateQuestionWhenRoundHasApplications() throws Exception {
            when(service.updateQuestion(eq(ROUND_ID), eq(QUESTION_ID_1), anyString(), anyBoolean()))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                            "Rounds with applications cannot have questions edited"));

            mockMvc.perform(put(BASE_URL + "/" + QUESTION_ID_1)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "พยายามแก้",
                                        "isRequired": false
                                    }
                                    """))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("TC-08-05C: ปฏิเสธการลบคำถามเมื่อรอบมีใบสมัครแล้ว ตอบกลับ 409 Conflict")
        void cannotDeleteQuestionWhenRoundHasApplications() throws Exception {
            doThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                    "Rounds with applications cannot have questions edited"))
                    .when(service).deleteQuestion(ROUND_ID, QUESTION_ID_1);

            mockMvc.perform(delete(BASE_URL + "/" + QUESTION_ID_1)
                            .with(authentication(committeeAuth()))
                            .with(csrf()))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("TC-08-05D: ปฏิเสธการจัดเรียงคำถามเมื่อรอบมีใบสมัครแล้ว ตอบกลับ 409 Conflict")
        void cannotReorderQuestionsWhenRoundHasApplications() throws Exception {
            when(service.reorderQuestions(eq(ROUND_ID), anyList()))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                            "Rounds with applications cannot have questions edited"));

            mockMvc.perform(put(BASE_URL + "/order")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionIds": ["41", "42"]
                                    }
                                    """))
                    .andExpect(status().isConflict());
        }
    }

    // =========================================================================
    // TC-08-06: การแยกแยะขอบเขตข้อมูลข้ามรอบ (Cross-Round Isolation)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-06: การแยกแยะขอบเขตข้อมูลข้ามรอบ (AC-05, BR-06)")
    class TestCase08_06 {

        @Test
        @DisplayName("TC-08-06A: อ้างอิง ID คำถามของรอบอื่นมาแก้ไขในรอบนี้ ตอบกลับ 404 Not Found")
        void foreignQuestionIdReturns404() throws Exception {
            when(service.updateQuestion(eq(ROUND_ID), eq(999L), anyString(), anyBoolean()))
                    .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Question not found in this round"));

            mockMvc.perform(put(BASE_URL + "/999")
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "คำถามข้ามรอบ",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isNotFound());
        }
    }

    // =========================================================================
    // TC-08-07: การควบคุมสิทธิ์และความปลอดภัย (Security & Authorization)
    // =========================================================================
    @Nested
    @DisplayName("TC-08-07: การควบคุมสิทธิ์และความปลอดภัย (BR-01, Pre-conditions)")
    class TestCase08_07 {

        @Test
        @DisplayName("TC-08-07A: ผู้ใช้ไม่ได้ Login เข้าถึงคำถาม ตอบกลับ 401 Unauthorized")
        void unauthenticatedUserCannotAccess() throws Exception {
            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(service);
        }

        @Test
        @DisplayName("TC-08-07B: ส่งคำขอ POST/PUT/DELETE โดยไม่มี CSRF Token ตอบกลับ 403 Forbidden")
        void missingCsrfTokenIsRejected() throws Exception {
            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "คำถาม",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isForbidden());

            mockMvc.perform(delete(BASE_URL + "/41")
                            .with(authentication(committeeAuth())))
                    .andExpect(status().isForbidden());

            verifyNoInteractions(service);
        }

        @Test
        @DisplayName("TC-08-07C: ผู้ใช้ทั่วไปที่ไม่ใช่กรรมการชมรม ตอบกลับ 403 Forbidden")
        void nonCommitteeCannotAccessQuestions() throws Exception {
            when(service.listQuestions(ROUND_ID))
                    .thenThrow(new AccessDeniedException("Active committee permission for the round's club is required"));

            mockMvc.perform(get(BASE_URL)
                            .with(authentication(nonCommitteeAuth())))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-08-07D: กรรมการที่ยื่นใบสมัครในรอบนั้นเอง (Self-Application) ถูกปฏิเสธ 403 Forbidden")
        void committeeApplicantCannotManageQuestions() throws Exception {
            when(service.listQuestions(ROUND_ID))
                    .thenThrow(new AccessDeniedException("Committee members cannot manage rounds they applied to"));

            mockMvc.perform(get(BASE_URL)
                            .with(authentication(committeeAuth())))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-08-07E: รอบรับสมัครที่ปิดตัวแล้ว หรือไม่ใช่สถานะ DRAFT ปฏิเสธด้วย 409 Conflict")
        void nonDraftRoundCannotEditQuestions() throws Exception {
            when(service.createQuestion(eq(ROUND_ID), anyString(), anyBoolean()))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                            "Only open draft rounds can have their questions edited"));

            mockMvc.perform(post(BASE_URL)
                            .with(authentication(committeeAuth()))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "questionText": "คำถามในรอบที่ปิดแล้ว",
                                        "isRequired": true
                                    }
                                    """))
                    .andExpect(status().isConflict());
        }
    }
}
