package com.tu.clubhub.application;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.config.AbsoluteSessionTimeoutFilter;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** US-04 / Task64 integration tests for GET /api/v1/me/applications and /{applicationId}. */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles({"test", "seedtest"})
@Import(MeApplicationIntegrationTest.MutableClockConfig.class)
@Transactional
class MeApplicationIntegrationTest {
    private static final Instant NOW = Instant.parse("2026-10-28T10:00:00Z");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private SessionRepository<?> sessionRepository;
    @Autowired private MutableClock clock;

    private long applicantId;
    private long otherApplicantId;
    private long reviewerId;
    private long categoryId;
    private long clubId;

    @BeforeEach
    void setUp() {
        clock.set(NOW);
        applicantId = insertStudent("ACTIVE", "ACTIVE");
        otherApplicantId = insertStudent("ACTIVE", "ACTIVE");
        reviewerId = insertStudent("ACTIVE", "ACTIVE");
        categoryId = jdbc.queryForObject(
                "INSERT INTO club_categories (name) VALUES (?) RETURNING id",
                Long.class,
                "Task64-" + UUID.randomUUID());
        clubId = insertClub("ชมรมทดสอบ Task64 " + UUID.randomUUID(), "ACTIVE", "https://images.example.org/clubs/t64.png");
    }

    @Test
    void unauthenticatedRequestsReceive401AuthenticationRequired() throws Exception {
        mockMvc.perform(get("/api/v1/me/applications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

        mockMvc.perform(get("/api/v1/me/applications/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void suspendedAccountReceives403AccountNotAllowed() throws Exception {
        long suspendedId = insertStudent("SUSPENDED", "ACTIVE");
        Cookie session = sessionCookie(suspendedId);

        mockMvc.perform(get("/api/v1/me/applications").cookie(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ALLOWED"));
    }

    @Test
    void emptyHistoryReturnsEmptyPage() throws Exception {
        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(0))
                .andExpect(jsonPath("$.page.totalPages").value(0));
    }

    @Test
    void listIgnoresSpoofedHeadersAndOrdersBySubmittedAtDescThenIdDesc() throws Exception {
        long round1 = insertRound(clubId, "รอบที่ 1", null);
        long round2 = insertRound(clubId, "รอบที่ 2", Instant.parse("2026-10-26T03:00:00Z"));
        long otherRound = insertRound(clubId, "รอบคนอื่น", null);

        long olderApp = insertApplication(round1, clubId, applicantId, "SUBMITTED",
                Instant.parse("2026-10-18T08:00:00Z"), null, null, null);
        long newerApp = insertApplication(round2, clubId, applicantId, "ACCEPTED",
                Instant.parse("2026-10-19T09:30:00Z"), reviewerId,
                Instant.parse("2026-10-25T19:00:00Z"), "ยินดีต้อนรับเข้าชมรม");
        insertApplication(otherRound, clubId, otherApplicantId, "SUBMITTED",
                Instant.parse("2026-10-20T10:00:00Z"), null, null, null);

        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications")
                        .param("page", "0")
                        .param("size", "20")
                        .param("userId", Long.toString(otherApplicantId))
                        .header("X-User-Id", Long.toString(otherApplicantId))
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].id").value(Long.toString(newerApp)))
                .andExpect(jsonPath("$.items[0].applicantVisibleStatus").value("ACCEPTED_PENDING_CONFIRMATION"))
                .andExpect(jsonPath("$.items[0].displayStatusLabel").value("ผ่านการคัดเลือก (รอยืนยันสิทธิ์)"))
                .andExpect(jsonPath("$.items[0].canConfirm").value(true))
                .andExpect(jsonPath("$.items[0].canDecline").value(true))
                .andExpect(jsonPath("$.items[1].id").value(Long.toString(olderApp)))
                .andExpect(jsonPath("$.items[1].applicantVisibleStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.items[1].displayStatusLabel").value("รอพิจารณา"))
                .andExpect(jsonPath("$.items[1].canConfirm").value(false))
                .andExpect(jsonPath("$.items[1].canDecline").value(false))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void prePublicationMasksInternalDecisionsReviewsAndHistory() throws Exception {
        // Scheduled publication time has already passed, but results_published_at is still NULL (TC-04-04, TC-04-05, TC-04-06).
        long unpublishedRound = insertRound(clubId, "รอบยังไม่ประกาศผล", null);
        long questionId = insertQuestion(unpublishedRound, "เล่าประสบการณ์ของคุณ", true, 1);
        long appId = insertApplication(unpublishedRound, clubId, applicantId, "ACCEPTED",
                Instant.parse("2026-10-19T09:30:00Z"), reviewerId,
                Instant.parse("2026-10-25T19:00:00Z"), "ข้อความผลลับก่อนประกาศ");
        insertAnswer(appId, questionId, unpublishedRound, "เคยจัดค่ายเขียนโปรแกรม");
        insertLink(appId, "Portfolio", "https://example.org/portfolio", 1);
        insertReview(appId, reviewerId, "ACCEPT", "ความเห็นภายในของกรรมการ ห้ามรั่ว");
        insertHistory(appId, null, "SUBMITTED", applicantId, "APPLICATION_SUBMITTED", Instant.parse("2026-10-19T09:30:00Z"));
        insertHistory(appId, "SUBMITTED", "UNDER_REVIEW", reviewerId, "COMMITTEE_REVIEW_STARTED", Instant.parse("2026-10-24T12:00:00Z"));
        insertHistory(appId, "UNDER_REVIEW", "ACCEPTED", reviewerId, "COMMITTEE_DECISION", Instant.parse("2026-10-25T19:00:00Z"));

        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications/" + appId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.id").value(Long.toString(appId)))
                .andExpect(jsonPath("$.applicantVisibleStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.displayStatusLabel").value("รอพิจารณา"))
                .andExpect(jsonPath("$.resultMessage").value(nullValue()))
                .andExpect(jsonPath("$.round.resultsPublishedAt").value(nullValue()))
                .andExpect(jsonPath("$.round.confirmationDeadline").value(nullValue()))
                .andExpect(jsonPath("$.canConfirm").value(false))
                .andExpect(jsonPath("$.canDecline").value(false))
                .andExpect(jsonPath("$.questionsWithAnswers", hasSize(1)))
                .andExpect(jsonPath("$.questionsWithAnswers[0].answerText").value("เคยจัดค่ายเขียนโปรแกรม"))
                .andExpect(jsonPath("$.links", hasSize(1)))
                .andExpect(jsonPath("$.links[0].url").value("https://example.org/portfolio"))
                .andExpect(jsonPath("$.statusHistory", hasSize(1)))
                .andExpect(jsonPath("$.statusHistory[0].status").value("SUBMITTED"))
                .andExpect(jsonPath("$.statusHistory[0].displayStatusLabel").value("ส่งใบสมัครแล้ว"))
                .andExpect(jsonPath("$.statusHistory[0].occurredAt").value("2026-10-19T09:30:00Z"))
                .andExpect(jsonPath("$.reviews").doesNotExist())
                .andExpect(header().string("Content-Type", containsString("application/json")))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(not(containsString("ข้อความผลลับก่อนประกาศ"))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(not(containsString("ความเห็นภายในของกรรมการ"))));
    }

    @Test
    void postPublicationExposesPublishedResultAndTimelineWithoutInternalNotes() throws Exception {
        Instant publishedAt = Instant.parse("2026-10-26T03:00:00Z");
        long publishedRound = insertRound(clubId, "รอบประกาศผลแล้ว", publishedAt);
        long acceptedAppId = insertApplication(publishedRound, clubId, applicantId, "ACCEPTED",
                Instant.parse("2026-10-19T09:30:00Z"), reviewerId,
                Instant.parse("2026-10-25T19:00:00Z"), "ยินดีด้วย กรุณายืนยันสิทธิ์ภายในกำหนด");
        insertReview(acceptedAppId, reviewerId, "ACCEPT", "หมายเหตุภายในหลังประกาศผลก็ห้ามแสดง");

        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications/" + acceptedAppId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicantVisibleStatus").value("ACCEPTED_PENDING_CONFIRMATION"))
                .andExpect(jsonPath("$.displayStatusLabel").value("ผ่านการคัดเลือก (รอยืนยันสิทธิ์)"))
                .andExpect(jsonPath("$.resultMessage").value("ยินดีด้วย กรุณายืนยันสิทธิ์ภายในกำหนด"))
                .andExpect(jsonPath("$.round.resultsPublishedAt").value("2026-10-26T03:00:00Z"))
                .andExpect(jsonPath("$.round.confirmationDeadline").value("2026-11-05T16:59:59Z"))
                .andExpect(jsonPath("$.canConfirm").value(true))
                .andExpect(jsonPath("$.canDecline").value(true))
                .andExpect(jsonPath("$.statusHistory", hasSize(2)))
                .andExpect(jsonPath("$.statusHistory[0].status").value("SUBMITTED"))
                .andExpect(jsonPath("$.statusHistory[1].status").value("ACCEPTED_PENDING_CONFIRMATION"))
                .andExpect(jsonPath("$.statusHistory[1].displayStatusLabel").value("ประกาศผลคัดเลือก (ผ่านการคัดเลือก)"))
                .andExpect(jsonPath("$.statusHistory[1].occurredAt").value("2026-10-26T03:00:00Z"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(not(containsString("หมายเหตุภายในหลังประกาศผล"))));

        // Advance clock past confirmation_deadline (2026-11-05T16:59:59Z): projects as EXPIRED even before worker runs.
        clock.set(Instant.parse("2026-11-06T00:00:00Z"));
        mockMvc.perform(get("/api/v1/me/applications/" + acceptedAppId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicantVisibleStatus").value("EXPIRED"))
                .andExpect(jsonPath("$.displayStatusLabel").value("สละสิทธิ์ (หมดเวลาตอบรับ)"))
                .andExpect(jsonPath("$.canConfirm").value(false))
                .andExpect(jsonPath("$.canDecline").value(false))
                .andExpect(jsonPath("$.statusHistory", hasSize(3)))
                .andExpect(jsonPath("$.statusHistory[2].status").value("EXPIRED"))
                .andExpect(jsonPath("$.statusHistory[2].occurredAt").value("2026-11-05T16:59:59Z"));
    }

    @Test
    void detailReturns403ForAnotherUsersApplicationAnd404WhenMissing() throws Exception {
        long round = insertRound(clubId, "รอบทดสอบสิทธิ์", null);
        long otherUsersAppId = insertApplication(round, clubId, otherApplicantId, "SUBMITTED",
                Instant.parse("2026-10-19T09:30:00Z"), null, null, null);

        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications/" + otherUsersAppId).cookie(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));

        mockMvc.perform(get("/api/v1/me/applications/999999999").cookie(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "abc", "0123"})
    void detailRejectsInvalidApplicationIdWith400(String invalidId) throws Exception {
        Cookie session = sessionCookie(applicantId);

        mockMvc.perform(get("/api/v1/me/applications/" + invalidId).cookie(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("INVALID_RESOURCE_ID")));
    }

    private long insertStudent(String accountStatus, String studentStatus) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long id = jdbc.queryForObject("""
                INSERT INTO users (tu_username, display_name, email, system_role, account_status)
                VALUES (?, ?, ?, 'USER', ?) RETURNING id
                """, Long.class, "u_" + suffix, "นักศึกษา " + suffix, suffix + "@dome.tu.ac.th", accountStatus);
        jdbc.update("""
                INSERT INTO student_profiles (user_id, student_code, faculty_name, study_year, student_status)
                VALUES (?, ?, 'คณะวิทยาศาสตร์และเทคโนโลยี', 2, ?)
                """, id, "66" + Math.abs(suffix.hashCode() % 100000000), studentStatus);
        return id;
    }

    private long insertClub(String name, String status, String imageUrl) {
        return jdbc.queryForObject("""
                INSERT INTO clubs (category_id, name, description, affiliation_level, affiliation_name, image_url, status, created_by)
                VALUES (?, ?, 'คำอธิบายชมรม', 'University', 'Thammasat University', ?, ?, ?) RETURNING id
                """, Long.class, categoryId, name, imageUrl, status, reviewerId);
    }

    private long insertRound(long targetClubId, String title, Instant resultsPublishedAt) {
        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester, description, opens_at, closes_at,
                     confirmation_deadline, results_scheduled_at, results_published_at,
                     publication_status, published_at, created_by)
                VALUES (?, ?, 2569, 1, 'รายละเอียดรอบรับสมัคร', ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?) RETURNING id
                """,
                Long.class,
                targetClubId,
                title,
                OffsetDateTime.ofInstant(Instant.parse("2026-10-01T00:00:00Z"), ZoneOffset.UTC),
                OffsetDateTime.ofInstant(Instant.parse("2026-10-25T16:59:59Z"), ZoneOffset.UTC),
                OffsetDateTime.ofInstant(Instant.parse("2026-11-05T16:59:59Z"), ZoneOffset.UTC),
                OffsetDateTime.ofInstant(Instant.parse("2026-10-26T00:00:00Z"), ZoneOffset.UTC),
                resultsPublishedAt == null ? null : OffsetDateTime.ofInstant(resultsPublishedAt, ZoneOffset.UTC),
                OffsetDateTime.ofInstant(Instant.parse("2026-10-01T00:00:00Z"), ZoneOffset.UTC),
                reviewerId);
    }

    private long insertQuestion(long roundId, String prompt, boolean required, int order) {
        return jdbc.queryForObject("""
                INSERT INTO application_questions (round_id, prompt, is_required, display_order, max_length)
                VALUES (?, ?, ?, ?, 2000) RETURNING id
                """, Long.class, roundId, prompt, required, order);
    }

    private long insertApplication(
            long roundId,
            long targetClubId,
            long ownerId,
            String status,
            Instant submittedAt,
            Long decidedBy,
            Instant decidedAt,
            String resultMessage) {
        return jdbc.queryForObject("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation, status, submitted_at, decided_by, decided_at, result_message, updated_at, version)
                VALUES (?, ?, ?, 'ผมต้องการร่วมทำกิจกรรมกับชมรม', ?, ?, ?, ?, ?, ?, 0) RETURNING id
                """,
                Long.class,
                roundId,
                targetClubId,
                ownerId,
                status,
                OffsetDateTime.ofInstant(submittedAt, ZoneOffset.UTC),
                decidedBy,
                decidedAt == null ? null : OffsetDateTime.ofInstant(decidedAt, ZoneOffset.UTC),
                resultMessage,
                OffsetDateTime.ofInstant(submittedAt, ZoneOffset.UTC));
    }

    private void insertAnswer(long applicationId, long questionId, long roundId, String answerText) {
        jdbc.update("""
                INSERT INTO application_answers (application_id, question_id, round_id, answer_text)
                VALUES (?, ?, ?, ?)
                """, applicationId, questionId, roundId, answerText);
    }

    private void insertLink(long applicationId, String label, String url, int order) {
        jdbc.update("""
                INSERT INTO application_links (application_id, label, url, display_order)
                VALUES (?, ?, ?, ?)
                """, applicationId, label, url, order);
    }

    private void insertReview(long applicationId, long reviewer, String recommendation, String comment) {
        jdbc.update("""
                INSERT INTO application_reviews (application_id, reviewer_id, recommendation, internal_comment)
                VALUES (?, ?, ?, ?)
                """, applicationId, reviewer, recommendation, comment);
    }

    private void insertHistory(
            long applicationId, String fromStatus, String toStatus, Long actorId, String reason, Instant changedAt) {
        jdbc.update("""
                INSERT INTO application_status_history (application_id, from_status, to_status, actor_id, reason, changed_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, applicationId, fromStatus, toStatus, actorId, reason,
                OffsetDateTime.ofInstant(changedAt, ZoneOffset.UTC));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Cookie sessionCookie(long uid) {
        Session session = sessionRepository.createSession();
        var principal = new ClubHubPrincipal(uid, "tu_" + uid, "USER");
        var auth = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(auth));
        session.setAttribute(
                AbsoluteSessionTimeoutFilter.LOGIN_AT_ATTRIBUTE,
                System.currentTimeMillis());
        ((SessionRepository) sessionRepository).save(session);
        String encoded = Base64.getEncoder().encodeToString(session.getId().getBytes(StandardCharsets.UTF_8));
        return new Cookie("SESSION", encoded);
    }

    @TestConfiguration
    static class MutableClockConfig {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock();
        }
    }

    static class MutableClock extends Clock {
        private final AtomicReference<Instant> current = new AtomicReference<>(NOW);

        void set(Instant instant) {
            current.set(instant);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current.get();
        }
    }
}
