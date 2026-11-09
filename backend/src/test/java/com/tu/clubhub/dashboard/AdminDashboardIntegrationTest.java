package com.tu.clubhub.dashboard;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${ROUNDS_TEST_DATABASE_URL:jdbc:postgresql://localhost:5432/tu_clubhub_test}",
        "spring.datasource.username=postgres",
        "spring.datasource.password=${DB_PASSWORD}",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.session.jdbc.initialize-schema=never",
        "tu.auth.mode=mock"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminDashboardIntegrationTest {

    private static final String PATH = "/api/v1/admin/dashboard/stats";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Clock clock;

    @Test
    void anonymousRequestReturns401() throws Exception {
        mvc.perform(get(PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void ordinaryUserCannotAccessStatistics() throws Exception {
        long userId = user("USER");

        mvc.perform(get(PATH)
                        .with(authentication(auth(userId, "USER"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void currentDatabaseRoleOverridesSessionRole() throws Exception {
        long userId = user("USER");

        // Session claims ADMIN, but database says USER.
        var sameAuthentication = auth(userId, "ADMIN");

        mvc.perform(get(PATH)
                        .with(authentication(sameAuthentication)))
                .andExpect(status().isForbidden());

        jdbc.update("""
                UPDATE users SET system_role = 'ADMIN' WHERE id = ?
                """, userId);

        mvc.perform(get(PATH)
                        .param("q", UUID.randomUUID().toString())
                        .with(authentication(sameAuthentication)))
                .andExpect(status().isOk());

        // Revoke ADMIN without replacing the authentication.
        jdbc.update("""
                UPDATE users SET system_role = 'USER' WHERE id = ?
                """, userId);

        mvc.perform(get(PATH)
                        .with(authentication(sameAuthentication)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aggregatesDoNotMultiplyApplicationsOrMemberships()
            throws Exception {

        Fixture f = fixture();

        // Database is ADMIN even though the session role says USER.
        mvc.perform(get(PATH)
                        .param("q", f.prefix())
                        .param("size", "2")
                        .with(authentication(auth(f.adminId(), "USER"))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.summary.totalClubs").value(6))
                .andExpect(jsonPath("$.summary.activeClubs").value(6))
                .andExpect(jsonPath("$.summary.inactiveClubs").value(0))
                .andExpect(jsonPath("$.summary.totalRecruitmentRounds")
                        .value(3))
                .andExpect(jsonPath("$.summary.openRecruitmentRounds")
                        .value(1))
                .andExpect(jsonPath("$.summary.clubsCurrentlyRecruiting")
                        .value(1))
                .andExpect(jsonPath("$.summary.totalApplications").value(4))
                .andExpect(jsonPath("$.summary.uniqueApplicants").value(2))
                .andExpect(jsonPath("$.summary.confirmedNewMembers")
                        .value(1))
                .andExpect(jsonPath("$.summary.currentActiveMemberships")
                        .value(3))
                .andExpect(jsonPath("$.summary.confirmationRatePercent")
                        .value(33.33))
                .andExpect(jsonPath("$.summary.statusBreakdown.SUBMITTED")
                        .value(1))
                .andExpect(jsonPath("$.summary.statusBreakdown.ACCEPTED")
                        .value(1))
                .andExpect(jsonPath("$.summary.statusBreakdown.CONFIRMED")
                        .value(1))
                .andExpect(jsonPath("$.summary.statusBreakdown.DECLINED")
                        .value(1))
                .andExpect(jsonPath("$.categoryBreakdown.length()").value(2))
                .andExpect(jsonPath("$.categoryBreakdown[0].clubCount")
                        .value(3))
                .andExpect(jsonPath("$.categoryBreakdown[0].totalApplications")
                        .value(3))
                .andExpect(jsonPath("$.categoryBreakdown[0].acceptedCount")
                        .value(2))
                .andExpect(jsonPath("$.categoryBreakdown[1].clubCount")
                        .value(3))
                .andExpect(jsonPath("$.categoryBreakdown[1].totalApplications")
                        .value(1))
                .andExpect(jsonPath("$.topClubs.length()").value(5))
                .andExpect(jsonPath("$.topClubs[0].clubId")
                        .value(Long.toString(f.firstClubId())))
                .andExpect(jsonPath("$.topClubs[0].totalApplications")
                        .value(3))
                .andExpect(jsonPath("$.topClubs[1].clubId")
                        .value(Long.toString(f.secondClubId())))
                .andExpect(jsonPath("$.topClubs[1].totalApplications")
                        .value(1))
                .andExpect(jsonPath("$.clubs.items.length()").value(2))
                .andExpect(jsonPath("$.clubs.page.totalElements").value(6))
                .andExpect(jsonPath("$.clubs.page.totalPages").value(3))
                .andExpect(jsonPath("$.clubs.items[0].acceptedCount")
                        .value(1))
                .andExpect(jsonPath("$.clubs.items[0].activeMemberCount")
                        .value(2));
    }

    @Test
    void academicYearFiltersRoundsButNotCurrentMemberships()
            throws Exception {

        Fixture f = fixture();

        mvc.perform(get(PATH)
                        .param("q", f.prefix())
                        .param("academicYear", "2569")
                        .param("semester", "1")
                        .with(authentication(auth(f.adminId(), "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalClubs").value(6))
                .andExpect(jsonPath("$.summary.totalRecruitmentRounds")
                        .value(2))
                .andExpect(jsonPath("$.summary.totalApplications").value(3))
                .andExpect(jsonPath("$.summary.uniqueApplicants").value(2))
                .andExpect(jsonPath("$.summary.currentActiveMemberships")
                        .value(3))
                .andExpect(jsonPath("$.summary.openRecruitmentRounds")
                        .value(0))
                .andExpect(jsonPath("$.filters.academicYear").value(2569))
                .andExpect(jsonPath("$.filters.semester").value(1));
    }

    @Test
    void emptyResultReturnsZeroMetricsAndEmptyLists() throws Exception {
        long admin = user("ADMIN");

        mvc.perform(get(PATH)
                        .param("q", "missing-" + UUID.randomUUID())
                        .with(authentication(auth(admin, "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalClubs").value(0))
                .andExpect(jsonPath("$.summary.totalApplications").value(0))
                .andExpect(jsonPath("$.summary.uniqueApplicants").value(0))
                .andExpect(jsonPath("$.summary.confirmationRatePercent")
                        .value(0))
                .andExpect(jsonPath("$.categoryBreakdown.length()").value(0))
                .andExpect(jsonPath("$.topClubs.length()").value(0))
                .andExpect(jsonPath("$.clubs.items.length()").value(0))
                .andExpect(jsonPath("$.clubs.page.totalPages").value(0));
    }

    @Test
    void invalidQueryParametersReturn400() throws Exception {
        long admin = user("ADMIN");

        for (String query : List.of(
                "?page=-1",
                "?size=0",
                "?size=101",
                "?semester=4",
                "?categoryId=0",
                "?academicYear=0",
                "?clubStatus=UNKNOWN",
                "?page=abc")) {

            mvc.perform(get(PATH + query)
                            .with(authentication(auth(admin, "ADMIN"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(
                            "application/problem+json"));
        }
    }

    private Fixture fixture() {
        long admin = user("ADMIN");
        long firstStudent = user("USER");
        long secondStudent = user("USER");

        String prefix = "stats-" + UUID.randomUUID();
        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        long firstCategory = category(prefix + "-category-A");
        long secondCategory = category(prefix + "-category-B");

        var clubs = new ArrayList<Long>();

        for (int i = 0; i < 6; i++) {
            long categoryId = i % 2 == 0
                    ? firstCategory
                    : secondCategory;

            clubs.add(jdbc.queryForObject("""
                    INSERT INTO clubs
                        (category_id, name, description, created_by)
                    VALUES (?, ?, 'Statistics test', ?)
                    RETURNING id
                    """, Long.class,
                    categoryId, prefix + "-club-" + i, admin));
        }

        long firstClub = clubs.get(0);
        long secondClub = clubs.get(1);

        long firstRound = round(firstClub, admin, 2569, false, now);
        long olderRound = round(firstClub, admin, 2568, true, now);
        long secondRound = round(secondClub, admin, 2569, false, now);

        application(
                firstRound, firstClub, firstStudent,
                "CONFIRMED", admin, now);
        application(
                firstRound, firstClub, secondStudent,
                "ACCEPTED", admin, now);
        application(
                olderRound, firstClub, firstStudent,
                "SUBMITTED", admin, now);
        application(
                secondRound, secondClub, secondStudent,
                "DECLINED", admin, now);

        membership(firstClub, firstStudent, now);
        membership(firstClub, secondStudent, now);
        membership(secondClub, firstStudent, now);

        return new Fixture(admin, prefix, firstClub, secondClub);
    }

    private long user(String role) {
        String suffix = UUID.randomUUID().toString();

        Long id = jdbc.queryForObject("""
                INSERT INTO users
                    (tu_username, display_name, system_role)
                VALUES (?, 'Statistics test user', ?)
                RETURNING id
                """, Long.class, "stats-user-" + suffix, role);

        jdbc.update("""
                INSERT INTO student_profiles
                    (user_id, student_code, student_status)
                VALUES (?, ?, 'ACTIVE')
                """, id,
                "T-" + suffix.replace("-", "").substring(0, 16));

        return id;
    }

    private long category(String name) {
        return jdbc.queryForObject("""
                INSERT INTO club_categories (name)
                VALUES (?) RETURNING id
                """, Long.class, name);
    }

    private long round(
            long club,
            long creator,
            int year,
            boolean open,
            OffsetDateTime now) {

        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds
                    (club_id, title, academic_year, semester,
                     description, opens_at, closes_at,
                     confirmation_deadline, publication_status,
                     published_at, results_published_at, created_by)
                VALUES (?, 'Statistics round', ?, 1, 'Test',
                        ?, ?, ?, 'PUBLISHED', ?, ?, ?)
                RETURNING id
                """, Long.class,
                club,
                year,
                now.minusDays(3),
                open ? now.plusDays(1) : now.minusDays(1),
                now.plusDays(3),
                now.minusDays(4),
                open ? null : now.minusHours(2),
                creator);
    }

    private void application(
            long round,
            long club,
            long applicant,
            String status,
            long decider,
            OffsetDateTime now) {

        boolean decided = !"SUBMITTED".equals(status);
        boolean responded = "CONFIRMED".equals(status)
                || "DECLINED".equals(status);

        jdbc.update("""
                INSERT INTO applications
                    (round_id, club_id, applicant_id, motivation,
                     status, submitted_at, decided_by,
                     decided_at, responded_at)
                VALUES (?, ?, ?, 'Statistics test application',
                        ?, ?, ?, ?, ?)
                """,
                round,
                club,
                applicant,
                status,
                now.minusDays(2),
                decided ? decider : null,
                decided ? now.minusHours(3) : null,
                responded ? now.minusHours(1) : null);
    }

    private void membership(
            long club,
            long user,
            OffsetDateTime now) {

        jdbc.update("""
                INSERT INTO club_memberships
                    (club_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', ?)
                """, club, user, now.minusDays(1));
    }

    private UsernamePasswordAuthenticationToken auth(
            long userId,
            String sessionRole) {

        return UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(
                        userId, "stats-user-" + userId, sessionRole),
                null,
                List.of());
    }

    private record Fixture(
            long adminId,
            String prefix,
            long firstClubId,
            long secondClubId) {
    }
}