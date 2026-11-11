package com.tu.clubhub.committee;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.config.AssignmentConfiguration.Properties;
import com.tu.clubhub.committee.repository.AdminAssignmentRepository;
import com.tu.clubhub.committee.service.AssignmentException;
import com.tu.clubhub.committee.service.AssignmentService;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Unit proof of narrow error classification; HTTP/PostgreSQL tests prove actual locking. */
class AssignmentServiceTest {
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest @CsvSource({
        "23P01,excl_committee_active_term,409",
        "23505,uq_committee_active_term_start,409",
        "55P03,none,503",
        "40P01,none,503",
        "23505,unrelated_unique,0",
        "23514,test_failure,0",
        "23P01,unrelated_exclusion,0"
    })
    void onlyNamedAssignmentConstraintsAndLockStatesAreClassified(String state, String constraint, int status) {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new ClubHubPrincipal(1L,"fictional","ADMIN"), null, List.of()));
        SecurityContextHolder.setContext(context);
        var repository = mock(AdminAssignmentRepository.class);
        var sql = new PSQLException(new ServerErrorMessage("SERROR\0C" + state + "\0n" + constraint + "\0Mfixture\0\0"));
        var database = new DataIntegrityViolationException("unit fixture", sql);
        when(repository.account(1)).thenThrow(database);
        var service = new AssignmentService(repository, Clock.systemUTC(), new Properties(Duration.ofSeconds(2)));
        if (status == 0) assertSame(database, assertThrows(DataIntegrityViolationException.class, () -> service.create("1", null)));
        else {
            var problem = assertThrows(AssignmentException.class, () -> service.create("1", null));
            assertEquals(status, problem.status()); assertSame(database, problem.getCause());
            assertEquals(status == 409 ? "RESOURCE_CONFLICT" : "SERVICE_UNAVAILABLE", problem.code());
            assertEquals(status == 409 ? "ASSIGNMENT_TERM_OVERLAP" : null, problem.reason());
        }
    }
}
