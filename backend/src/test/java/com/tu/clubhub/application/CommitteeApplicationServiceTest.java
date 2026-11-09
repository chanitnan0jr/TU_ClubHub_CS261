package com.tu.clubhub.application;

import com.tu.clubhub.application.dto.CommitteeClubApplicationSummary;
import com.tu.clubhub.application.repository.CommitteeApplicationRepository;
import com.tu.clubhub.application.repository.CommitteeApplicationRepository.*;
import com.tu.clubhub.application.service.ApplicationSubmissionException;
import com.tu.clubhub.application.service.CommitteeApplicationService;
import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.security.ClubSecurity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CommitteeApplicationServiceTest {
    private final CommitteeApplicationRepository repository = mock(CommitteeApplicationRepository.class);
    private final ClubSecurity security = mock(ClubSecurity.class);
    private final CommitteeApplicationService service = new CommitteeApplicationService(repository, security);

    @BeforeEach void authenticated() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new ClubHubPrincipal(7L, "fictional", "ADMIN"), null, List.of()));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @Test void scopesCountAndPageWithIdenticalFiltersAndStableMetadata() {
        when(security.isCommittee(10L)).thenReturn(true);
        when(repository.findRound(20L)).thenReturn(Optional.of(new RoundScope(10L, "PUBLISHED", true)));
        var filter = new Filter(10, 7, 20L, "SUBMITTED", "Student");
        when(repository.count(filter)).thenReturn(3L);
        var item = new CommitteeClubApplicationSummary("30", "20", null, Instant.EPOCH, "SUBMITTED");
        when(repository.list(filter, 1, 2)).thenReturn(List.of(item));
        var result = service.list("10", "20", "SUBMITTED", " Student ", 1, 2);
        assertEquals(List.of(item), result.items());
        assertEquals(1, result.page().number()); assertEquals(2, result.page().size());
        assertEquals(3, result.page().totalElements()); assertEquals(2, result.page().totalPages());
        verify(repository).count(filter); verify(repository).list(filter, 1, 2);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void globalAdminWithoutAssignmentCannotProbeChildExistence(boolean detail) {
        failure(403, () -> {
            if (detail) service.detail("10", "999"); else service.list("10", "999", null, null, 0, 20);
        });
        verifyNoInteractions(repository);
    }

    @Test void anonymousCannotAccessEvenThroughDirectServiceInvocation() {
        SecurityContextHolder.clearContext();
        failure(401, () -> service.list("10", null, null, null, 0, 20));
        failure(401, () -> service.detail("10", "30"));
        verifyNoInteractions(security, repository);
    }

    @Test void foreignApplicationIsForbiddenBeforeItsDetailOrAnswersAreRead() {
        when(security.isCommittee(10L)).thenReturn(true);
        when(repository.findApplicationScope(30L)).thenReturn(Optional.of(new ApplicationScope(11, 21)));
        failure(403, () -> service.detail("10", "30"));
        verify(repository).findApplicationScope(30L); verifyNoMoreInteractions(repository);
    }

    @Test void explicitSelfReviewRoundIsForbiddenBeforeCountOrDetail() {
        when(security.isCommittee(10L)).thenReturn(true);
        when(repository.findRound(20L)).thenReturn(Optional.of(new RoundScope(10, "PUBLISHED", true)));
        when(repository.isApplicant(7, 20)).thenReturn(true);
        failure(403, () -> service.list("10", "20", null, null, 0, 20));
        verify(repository, never()).count(any()); verify(repository, never()).list(any(), anyInt(), anyInt());
    }

    @ParameterizedTest @ValueSource(strings = {"DRAFT", "CANCELLED"})
    void unavailableRoundRetainsBusinessConflictReasons(String state) {
        when(security.isCommittee(10L)).thenReturn(true);
        when(repository.findRound(20L)).thenReturn(Optional.of(new RoundScope(10, state, false)));
        var error = failure(409, () -> service.list("10", "20", null, null, 0, 20));
        assertEquals(state.equals("DRAFT") ? "ROUND_NOT_PUBLISHED" : "ROUND_CANCELLED", error.reason());
        verify(repository, never()).count(any());
    }

    @Test void validatesQueriesForDirectServiceCallers() {
        when(security.isCommittee(10L)).thenReturn(true);
        for (String id : List.of("0", "-1", "01", "1.5", "9223372036854775808")) {
            assertEquals("INVALID_RESOURCE_ID", failure(400, () -> service.detail(id, "30")).code());
            assertEquals("INVALID_RESOURCE_ID", failure(400, () -> service.detail("10", id)).code());
        }
        failure(400, () -> service.list("10", null, "PENDING", null, 0, 20));
        failure(400, () -> service.list("10", null, null, "😀".repeat(201), 0, 20));
        failure(400, () -> service.list("10", null, null, null, -1, 20));
        failure(400, () -> service.list("10", null, null, null, 0, 101));
        verifyNoInteractions(repository);
    }

    private static ApplicationSubmissionException failure(int status, org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(ApplicationSubmissionException.class, action);
        assertEquals(status, error.status());
        return error;
    }
}
