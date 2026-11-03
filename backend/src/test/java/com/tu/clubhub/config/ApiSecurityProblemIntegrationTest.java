package com.tu.clubhub.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Real PostgreSQL, ClubSecurity, Service and Repositories; no authorization mocks. */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles({"test", "seedtest"})
@Transactional
class ApiSecurityProblemIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired jakarta.persistence.EntityManager entityManager;
    String prefix;
    long committee, member, otherCommittee, admin, club, otherClub, inactiveClub, draft, inactiveRound;

    @BeforeEach void fixtures() {
        prefix = "task80-" + UUID.randomUUID();
        committee = account("committee", "USER"); member = account("member", "USER");
        otherCommittee = account("other", "USER"); admin = account("admin", "ADMIN");
        long category = jdbc.queryForObject("INSERT INTO club_categories(name) VALUES (?) RETURNING id", Long.class, prefix);
        club = club(category, "club", "ACTIVE"); otherClub = club(category, "other", "ACTIVE");
        inactiveClub = club(category, "hidden", "INACTIVE");
        assignment(committee, club); assignment(otherCommittee, otherClub);
        jdbc.update("INSERT INTO club_memberships(club_id,user_id,status,joined_at) VALUES (?,?,'ACTIVE',now()-interval '1 day')", club, member);
        draft = round(club, "DRAFT"); inactiveRound = round(inactiveClub, "PUBLISHED");
    }

    @Test void anonymousWriteWithValidCsrfIs401NotCsrf403() throws Exception {
        problem(mvc.perform(put("/api/v1/clubs/" + club).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body())),
                401, "AUTHENTICATION_REQUIRED");
    }

    @Test void ordinaryMemberWithValidCsrfIsDeniedByPermissionRule() throws Exception {
        problem(update(member, "USER"), 403, "ACCESS_DENIED");
        assertEquals(prefix + "club", jdbc.queryForObject("SELECT name FROM clubs WHERE id=?", String.class, club));
    }

    @Test void adminWithoutClubAssignmentIs403WithValidCsrf() throws Exception {
        problem(update(admin, "ADMIN"), 403, "ACCESS_DENIED");
    }

    @Test void committeeOfAnotherClubIs403WithValidCsrf() throws Exception {
        problem(update(otherCommittee, "USER"), 403, "ACCESS_DENIED");
    }

    @Test void effectiveCommitteePassesRealGuardAndUpdatesClub() throws Exception {
        update(committee, "USER").andExpect(status().isOk()).andExpect(jsonPath("$.id").value(Long.toString(club)))
                .andExpect(jsonPath("$.name").value(prefix + "updated"));
        // This same-thread MockMvc test joins the fixture transaction; flush JPA before JDBC assertions.
        entityManager.flush();
        assertEquals(prefix + "updated", jdbc.queryForObject("SELECT name FROM clubs WHERE id=?", String.class, club));
    }

    @Test void suspendedAccountIsDistinctFromRbacAndCsrf() throws Exception {
        jdbc.update("UPDATE users SET account_status='SUSPENDED' WHERE id=?", committee);
        problem(update(committee, "USER"), 403, "ACCOUNT_NOT_ALLOWED");
    }

    @Test void missingResourceForEligibleStudentIs404() throws Exception {
        problem(form(Long.MAX_VALUE - 1), 404, "RESOURCE_NOT_FOUND");
    }

    @Test void draftAndInactiveResourcesAreIndistinguishableFromAbsentForms() throws Exception {
        JsonNode absent = json(problem(form(Long.MAX_VALUE - 1), 404, "RESOURCE_NOT_FOUND"));
        JsonNode hiddenDraft = json(problem(form(draft), 404, "RESOURCE_NOT_FOUND"));
        JsonNode hiddenClub = json(problem(form(inactiveRound), 404, "RESOURCE_NOT_FOUND"));
        for (String field : List.of("type", "title", "status", "detail", "code")) {
            assertEquals(absent.get(field), hiddenDraft.get(field), field);
            assertEquals(absent.get(field), hiddenClub.get(field), field);
        }
    }

    @Test void publicClubAndRoundsStillAllowAnonymousAccess() throws Exception {
        mvc.perform(get("/api/v1/public/clubs/" + club)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(Long.toString(club)));
        mvc.perform(get("/api/v1/public/clubs/" + club + "/recruitment-rounds")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test void inactiveAndMissingPublicClubsHaveSameProblemDescription() throws Exception {
        JsonNode absent = json(problem(mvc.perform(get("/api/v1/public/clubs/" + (Long.MAX_VALUE-1))), 404, "CLUB_NOT_FOUND"));
        JsonNode hidden = json(problem(mvc.perform(get("/api/v1/public/clubs/" + inactiveClub)), 404, "CLUB_NOT_FOUND"));
        for (String field : List.of("type", "title", "status", "detail", "code")) assertEquals(absent.get(field), hidden.get(field), field);
    }

    private ResultActions update(long id, String role) throws Exception {
        return mvc.perform(put("/api/v1/clubs/" + club).with(authentication(auth(id, role))).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body()));
    }
    private String body() { return "{\"name\":\"" + prefix + "updated\",\"description\":\"Fictional test club\"}"; }
    private ResultActions form(long id) throws Exception {
        return mvc.perform(get("/api/v1/rounds/" + id + "/application-form").with(authentication(auth(member, "USER"))));
    }
    private UsernamePasswordAuthenticationToken auth(long id, String role) {
        return UsernamePasswordAuthenticationToken.authenticated(new ClubHubPrincipal(id, prefix, role), null, List.of());
    }
    private ResultActions problem(ResultActions result, int status, String code) throws Exception {
        return result.andExpect(status().is(status)).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.status").value(status)).andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.type").isNotEmpty()).andExpect(jsonPath("$.title").isNotEmpty())
                .andExpect(jsonPath("$.detail").isNotEmpty()).andExpect(jsonPath("$.instance").isNotEmpty())
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }
    private JsonNode json(ResultActions result) throws Exception { return mapper.readTree(result.andReturn().getResponse().getContentAsString()); }
    private long account(String suffix, String role) {
        long id = jdbc.queryForObject("INSERT INTO users(tu_username,display_name,system_role) VALUES (?, ?, ?) RETURNING id",
                Long.class, prefix+suffix, "Fictional user", role);
        jdbc.update("INSERT INTO student_profiles(user_id,student_code,student_status) VALUES (?,?,'ACTIVE')", id, Long.toString(id));
        return id;
    }
    private long club(long category, String suffix, String status) {
        return jdbc.queryForObject("INSERT INTO clubs(category_id,name,description,status,created_by) VALUES (?,?,'Fictional',?,?) RETURNING id",
                Long.class, category, prefix+suffix, status, committee);
    }
    private void assignment(long user, long club) {
        long membership = jdbc.queryForObject("INSERT INTO club_memberships(club_id,user_id,status,joined_at) VALUES (?,?,'ACTIVE',now()-interval '1 day') RETURNING id", Long.class, club, user);
        jdbc.update("INSERT INTO club_committee_assignments(membership_id,position_name,permission_role,starts_at,ends_at,assigned_by) VALUES (?,'Fictional','COMMITTEE',now()-interval '1 day',now()+interval '1 day',?)", membership, committee);
    }
    private long round(long club, String publication) {
        return jdbc.queryForObject("""
                INSERT INTO recruitment_rounds(club_id,title,academic_year,semester,description,publication_status,
                    opens_at,closes_at,confirmation_deadline,published_at,created_by)
                VALUES (?,'Fictional',2569,1,'Fictional',?,now()-interval '1 day',now()+interval '1 day',
                    now()+interval '2 day',CASE WHEN ?='PUBLISHED' THEN now()-interval '1 day' ELSE NULL END,?) RETURNING id
                """, Long.class, club, publication, publication, committee);
    }
}
