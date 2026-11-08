package com.tu.clubhub.committee.service;

import com.tu.clubhub.auth.service.ClubHubPrincipal;
import com.tu.clubhub.committee.config.AssignmentConfiguration;
import com.tu.clubhub.committee.dto.AssignmentRequests.*;
import com.tu.clubhub.committee.dto.AssignmentView;
import com.tu.clubhub.committee.repository.AdminAssignmentRepository;
import com.tu.clubhub.committee.repository.AdminAssignmentRepository.Account;
import com.tu.clubhub.committee.repository.AdminAssignmentRepository.Membership;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin commands serialize on the recipient profile, then assignment rows before club/membership. */
@Service
public class AssignmentService {
    private final AdminAssignmentRepository repository;
    private final Clock clock;
    private final String lockTimeout;
    public AssignmentService(AdminAssignmentRepository repository, Clock clock, AssignmentConfiguration.Properties properties) {
        this.repository = repository; this.clock = clock; this.lockTimeout = properties.databaseLockTimeout();
    }

    @Transactional(readOnly = true)
    public AssignmentView get(String rawClubId, String rawId) {
        requireAdmin(repository.account(actor()));
        long clubId = id(rawClubId), assignmentId = id(rawId);
        var row = repository.find(assignmentId).orElseThrow(AssignmentService::missing);
        if (!Long.toString(clubId).equals(row.clubId())) throw denied();
        return row;
    }

    @Transactional(rollbackFor = Exception.class)
    public AssignmentView create(String rawClubId, Create request) {
        return databaseErrors(() -> {
            long actor = actor(); requireAdmin(repository.account(actor));
            long clubId = id(rawClubId);
            if (request == null) throw AssignmentException.invalid("request", "Request body is required.");
            long membershipId = id(request.membershipId());
            var membership = repository.membership(membershipId, false).orElseThrow(AssignmentService::missing);
            var locked = lock(actor, clubId, membership);
            Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
            requireRecipient(locked, now);
            var grant = validate(request, now);
            if (repository.overlaps(membershipId, grant.role(), grant.start(), grant.end(), null)) throw overlap();
            long created = insert(membershipId, grant, actor, null, now);
            repository.audit(created, actor, "ASSIGNED", grant.reason(), now, UUID.randomUUID());
            return repository.find(created).orElseThrow(AssignmentService::missing);
        });
    }

    @Transactional(rollbackFor = Exception.class)
    public AssignmentView replace(String rawClubId, String rawId, Replace request) {
        return databaseErrors(() -> {
            long actor = actor(); requireAdmin(repository.account(actor));
            long clubId = id(rawClubId), assignmentId = id(rawId);
            if (request == null) throw AssignmentException.invalid("request", "Request body is required.");
            var initial = scoped(clubId, assignmentId);
            var membership = repository.membership(id(initial.membershipId()), false).orElseThrow(AssignmentService::missing);
            var locked = lock(actor, clubId, membership);
            var previous = scoped(clubId, assignmentId); // Fresh after both profile and assignment locks.
            requireVersion(previous, request.version());
            Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
            requireRecipient(locked, now);
            var grant = validate(request, now);
            if (repository.overlaps(membership.id(), grant.role(), grant.start(), grant.end(), assignmentId)) throw overlap();
            if (repository.revoke(assignmentId, request.version(), actor, grant.reason(), now) != 1) throw stale();
            long created = insert(membership.id(), grant, actor, assignmentId, now);
            UUID trace = UUID.randomUUID();
            repository.audit(assignmentId, actor, "REVOKED", grant.reason(), now, trace);
            repository.audit(created, actor, "ASSIGNED", grant.reason(), now, trace);
            return repository.find(created).orElseThrow(AssignmentService::missing);
        });
    }

    @Transactional(rollbackFor = Exception.class)
    public AssignmentView revoke(String rawClubId, String rawId, Revoke request) {
        return databaseErrors(() -> {
            long actor = actor(); requireAdmin(repository.account(actor));
            long clubId = id(rawClubId), assignmentId = id(rawId);
            if (request == null) throw AssignmentException.invalid("request", "Request body is required.");
            var initial = scoped(clubId, assignmentId);
            var membership = repository.membership(id(initial.membershipId()), false).orElseThrow(AssignmentService::missing);
            lock(actor, clubId, membership); // Revocation intentionally does not require an active recipient/club.
            var previous = scoped(clubId, assignmentId);
            requireVersion(previous, request.version());
            String reason = text(request.reason(), 2000, "reason");
            Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
            if (repository.revoke(assignmentId, request.version(), actor, reason, now) != 1) throw stale();
            repository.audit(assignmentId, actor, "REVOKED", reason, now, UUID.randomUUID());
            return scoped(clubId, assignmentId);
        });
    }

    private LockedRecipient lock(long actor, long clubId, Membership scope) {
        if (scope.clubId() != clubId || scope.userId() == actor) throw denied();
        repository.lockTimeout(lockTimeout);
        var accounts = repository.lockAccounts(actor, scope.userId()); // Sorted by users.id; stable current Admin role.
        requireAdmin(accounts.stream().filter(a -> a.id() == actor).findFirst());
        var target = accounts.stream().filter(a -> a.id() == scope.userId()).findFirst().orElseThrow(AssignmentService::missing);
        String student = repository.lockStudent(scope.userId()).orElseThrow(AssignmentService::missing);
        repository.lockAssignments(scope.id()); // Must precede clubs/membership; conflicts with ClubSecurity's FOR SHARE.
        String club = repository.lockClub(clubId).orElseThrow(AssignmentService::missing);
        var membership = repository.membership(scope.id(), true).orElseThrow(AssignmentService::missing);
        if (membership.userId() != scope.userId() || membership.clubId() != clubId) throw denied();
        return new LockedRecipient(target.status(), student, club, membership);
    }
    private AssignmentView scoped(long clubId, long id) {
        var row = repository.find(id).orElseThrow(AssignmentService::missing);
        if (!Long.toString(clubId).equals(row.clubId())) throw denied();
        return row;
    }
    private long insert(long membershipId, ValidGrant grant, long actor, Long replaces, Instant now) {
        return repository.insert(membershipId, grant.position(), grant.role(), grant.start(), grant.end(), actor, grant.reason(), replaces, now);
    }
    private static void requireRecipient(LockedRecipient recipient, Instant now) {
        var membership = recipient.membership();
        if (!"ACTIVE".equals(recipient.account()) || !"ACTIVE".equals(recipient.student()) || !"ACTIVE".equals(recipient.club())
                || !"ACTIVE".equals(membership.status()) || membership.endedAt() != null || membership.joinedAt().isAfter(now))
            throw AssignmentException.conflict("ASSIGNMENT_RECIPIENT_INELIGIBLE");
    }
    private static ValidGrant validate(Grant request, Instant now) {
        String position = text(request.positionName(), 100, "positionName"), reason = text(request.reason(), 2000, "reason");
        if (!Set.of("COMMITTEE", "PRESIDENT").contains(request.permissionRole() == null ? "" : request.permissionRole()))
            throw AssignmentException.invalid("permissionRole", "Use COMMITTEE or PRESIDENT.");
        Instant start = request.startsAt() == null ? now : request.startsAt(), end = request.endsAt();
        if (start.isBefore(now)) throw AssignmentException.invalid("startsAt", "Backdated appointments are not allowed.");
        if (end == null || !start.isBefore(end)) throw AssignmentException.invalid("endsAt", "The term must end after it starts.");
        for (Instant time : new Instant[] {start, end}) {
            if (time.getNano() % 1000 != 0 || time.isBefore(Instant.parse("0001-01-01T00:00:00Z"))
                    || !time.isBefore(Instant.parse("+10000-01-01T00:00:00Z")))
                throw AssignmentException.invalid("endsAt", "Use supported offset timestamps with microsecond precision.");
        }
        return new ValidGrant(position, request.permissionRole(), start, end, reason);
    }
    private static String text(String value, int maximum, String field) {
        if (value == null || value.codePoints().allMatch(c -> Character.isWhitespace(c) || Character.isSpaceChar(c) || c == 0x85)
                || value.codePointCount(0, value.length()) > maximum)
            throw AssignmentException.invalid(field, "A nonblank string within the field length limit is required.");
        return value.strip();
    }
    private static void requireVersion(AssignmentView row, long version) {
        if (version < 0) throw AssignmentException.invalid("version", "A nonnegative version is required.");
        if (row.version() != version) throw stale();
        if (!"ACTIVE".equals(row.status()) || row.revokedAt() != null) throw AssignmentException.conflict("ASSIGNMENT_ALREADY_REVOKED");
    }
    private static void requireAdmin(Optional<Account> account) {
        var current = account.orElseThrow(() -> AssignmentException.failure(401, "AUTHENTICATION_REQUIRED"));
        if (!"ACTIVE".equals(current.status())) throw AssignmentException.failure(403, "ACCOUNT_NOT_ALLOWED");
        if (!"ADMIN".equals(current.role())) throw denied();
    }
    private static long actor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal() instanceof ClubHubPrincipal principal)
                || principal.userId() == null || principal.userId() <= 0)
            throw AssignmentException.failure(401, "AUTHENTICATION_REQUIRED");
        return ((ClubHubPrincipal) authentication.getPrincipal()).userId();
    }
    private static long id(String value) {
        try { if (value == null || !value.matches("[1-9][0-9]{0,18}")) throw new IllegalArgumentException(); return Long.parseLong(value); }
        catch (IllegalArgumentException exception) { throw AssignmentException.failure(400, "INVALID_RESOURCE_ID"); }
    }
    private static <T> T databaseErrors(Supplier<T> action) {
        try { return action.get(); }
        catch (DataAccessException exception) {
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof PSQLException sql && sql.getServerErrorMessage() != null
                        && (("23P01".equals(sql.getSQLState()) && "excl_committee_active_term".equals(sql.getServerErrorMessage().getConstraint()))
                        || ("23505".equals(sql.getSQLState()) && "uq_committee_active_term_start".equals(sql.getServerErrorMessage().getConstraint()))))
                    throw caused(overlap(), exception);
                if (cause instanceof SQLException sql && Set.of("55P03", "40P01").contains(sql.getSQLState() == null ? "" : sql.getSQLState()))
                    throw caused(AssignmentException.failure(503, "SERVICE_UNAVAILABLE"), exception);
            }
            throw exception;
        }
    }
    private static AssignmentException caused(AssignmentException result, Exception cause) { result.initCause(cause); return result; }
    private static AssignmentException missing() { return AssignmentException.failure(404, "RESOURCE_NOT_FOUND"); }
    private static AssignmentException denied() { return AssignmentException.failure(403, "ACCESS_DENIED"); }
    private static AssignmentException stale() { return AssignmentException.conflict("VERSION_MISMATCH"); }
    private static AssignmentException overlap() { return AssignmentException.conflict("ASSIGNMENT_TERM_OVERLAP"); }
    private record LockedRecipient(String account, String student, String club, Membership membership) {}
    private record ValidGrant(String position, String role, Instant start, Instant end, String reason) {}
}
