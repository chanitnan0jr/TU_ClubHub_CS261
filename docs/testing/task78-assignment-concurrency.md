# Task78 — Admin assignments, concurrency and audit

Local handoff: **2026-11-09**. Branch `fix/assignment-concurrency`, based on
`main` **e2712a9e8e7f44b57b80f3031d9475985ba9aa83**. Main was fetched, remote HEAD
confirmed, and fast-forward pulled before creating this task's worktree.
No applicable AGENTS.md was found; COMMIT_RULES.md and the dependency/contract
sources were read. No commit, push, PR, merge, hard reset or stash was performed.

**Status: local checks passed; GitHub Actions, reviewer approval and deployment
have not happened for this work.** The initial scope confirmation is preserved in
[the planning record](task78-assignment-concurrency-plan.md).

## Scope and decisions

Main had the assignment model, `@Version` and effective-grant query/SHARE locks,
but no mutation service or Admin assignment HTTP contract. The requester explicitly
selected **Admin API + contract + migration + concurrent HTTP tests**. Accordingly
this is a new capability (`feat`), with two demonstrated database invariant gaps
corrected; it is not a claim that a nonexistent Admin endpoint had a reproduced
lost-update bug.

Policy evidence:

- [Permission matrix](../security/permission-matrix.md) §2: ACTIVE/effective
  membership, `[starts_at, ends_at)`, no overlapping unrevoked terms per
  membership/role, distinct COMMITTEE/PRESIDENT.
- Matrix §5: current ACTIVE Admin, no self-management, ACTIVE appointment
  recipient, revoke inactive recipients, preserve history using revoke-and-create,
  no backdating, reason/audit. No bootstrap/global-role/account-status capability.
- Matrix §§6–7 and [Task75 §4.2](../architecture/task75-sprint2-design.md):
  transaction/lock hierarchy, live authorization, safe Problem errors.
- [Task78](../tasks/sprint2/Task78.md): actual database results under concurrent
  changes and deterministic conflict handling.

## Files and behavior

All Java paths below are under `backend/src/main/java/com/tu/clubhub/committee/`.

| File | Purpose |
|---|---|
| `controller/AdminAssignmentController.java` | GET retained assignment; POST create/replace/revoke, no-store, new-resource Location |
| `controller/AssignmentExceptionHandler.java` | Existing Problem envelope, root reason, strict JSON errors, account-session invalidation |
| `service/AssignmentService.java` | Fresh DB Admin, self-management checks, lock hierarchy, expected version, atomic revoke/create/audit, narrow SQL error classification |
| `service/AssignmentException.java` | Safe domain codes/reasons and field errors |
| `repository/AdminAssignmentRepository.java` | JDBC locks, EXISTS overlap check, conditional versioned revoke, retained read DTO and audit writes |
| `dto/AssignmentRequests.java` | Strict create/replace/revoke JSON: IDs as strings, versions as integers, no client identity/status/audit fields |
| `dto/AssignmentView.java` | Explicit Admin allowlist without applicant contents or nested internal DTOs |
| `config/AssignmentConfiguration.java` | Bounded per-transaction lock timeout, default 2s |

Other changed/new files:

- `backend/src/main/resources/db/migration/V4__committee_assignment_integrity_and_audit.sql`:
  `assignment_reason`, self-reference `replaces_assignment_id`, active-term partial
  unique/exclusion constraints, durable `committee_assignment_audit`.
- Four new tests under `backend/src/test/java/com/tu/clubhub/committee/`, listed below.
- `docs/api/openapi.yaml` / `API_v1.md`: four Admin operations, strict DTO schemas,
  success/error examples, time/version/permission rules.
- `docs/database/TU-ClubHub-ERD-Updated.dbml`: new fields/audit table and references;
  comments make V4 authoritative for predicates/GiST constraints DBML cannot express.
- `README.md`, permission-matrix implementation notes and Task78 card: implementation
  handoff links, with CI/review/rollout still pending.
- This report and the historical planning record.

No frontend, existing tests, existing migrations, authentication/public matchers,
service contract from Task52/65, global roles, membership lifecycle or CI configuration
was modified in this task.

## API contract

Base: `/api/v1/admin/clubs/{clubId}/committee-assignments`.

| Method / suffix | Success |
|---|---|
| `POST` base | `201 AdminAssignment`, Location of new ID |
| `GET /{assignmentId}` | `200 AdminAssignment`, including retained revoked/inactive history |
| `POST /{assignmentId}/replace` | `201` new ID/version 0, `replacesAssignmentId`; old row REVOKED/version+1 |
| `POST /{assignmentId}/revoke` | `200` old retained ID, REVOKED/version+1 |

SESSION required for all; CSRF header required on POST. Current DB role and ACTIVE
account authorize Admin operations, regardless of stale session authorities. Self-read
is permitted; self-management is forbidden. Missing resources return 404; existing
wrong-club resources return 403. Decimal IDs fit positive signed bigint. Reasons and
text limits, explicit-offset timestamps, six-digit maximum fractional precision,
UTC year bounds, unknown-field rejection and no-backdating are in the contract.

Conflicts use `409 RESOURCE_CONFLICT` with **root** `reason`:
`VERSION_MISMATCH`, `ASSIGNMENT_ALREADY_REVOKED`, `ASSIGNMENT_TERM_OVERLAP`,
`ASSIGNMENT_RECIPIENT_INELIGIBLE`. No conflict retry. Only named assignment term
constraints become overlap; unrelated integrity errors remain safe 500. Lock
SQLSTATE 55P03/40P01 becomes bounded 503. No SQL, stack trace or rejected private
values are put in responses.

## Database evidence before and after migration

The same three `AssignmentInvariantIntegrationTest` methods were run before V4:

| Method | Before V4 | With V4 |
|---|---|---|
| `nativeOverlappingUnrevokedTermsAreRejected` | **Failed**: expected DataIntegrityViolationException, nothing thrown | Passed; SQLSTATE 23P01, `excl_committee_active_term` |
| `revokedHistoryDoesNotBlockReplacementAtTheSameStart` | **Error**: old `uq_committee_membership_role_start` rejected a new retained row even after old revocation | Passed; old row retained and new ID allowed |
| `adjacentTermsAndDifferentRolesAreAllowed` | Passed | Passed |

The original broad unique key covered historical rows but not overlaps at different
starts. V4 replaces it with a partial unique index and GiST exclusion over
`tstzrange(starts_at, ends_at, '[)')`, restricted to ACTIVE/unrevoked rows. This also
covers native INSERT/UPDATE term violations. Service locks and expected versions
still protect intent and multi-row atomicity; constraints alone do not provide audit
or Admin authorization for privileged SQL.

An initial new-test fixture omitted joined_at, and an HTTP fixture combined INACTIVE
with ended_at in violation of an existing check. Those fixtures were corrected to
real schema-valid data; no existing assertion or production rule was relaxed. The
pre-V4 table above comes from the subsequent schema-valid red run.

## Concurrency and rollback proof

- Fixtures commit in setup; no outer test transaction pretends to roll back workers.
- Two actual MockMvc requests use real session login, JDBC SESSION storage, fresh
  CSRF, security filters, Service proxy, Repository and PostgreSQL. Only the external
  TU adapter uses a fictional-identity allowlist. No Service/Repository mocks prove locks.
- A transaction listener captures `pg_backend_pid()` and `txid_current()` at each
  Admin service transaction start. These are asserted different for overlapping requests.
- First command waits on a bounded latch after real row locks and before writes.
  `pg_blocking_pids`/recursive wait-chain queries prove another open HTTP transaction
  is blocked behind it. Both futures must remain unfinished before release.
- Locks: sorted actor/target users SHARE → target profile UPDATE → assignment rows
  by ID UPDATE → club SHARE → membership UPDATE. Current state/time are read after
  locks; conditional versioned UPDATE is used, with no in-memory mutex.
- Test-only BEFORE INSERT audit triggers verify old revocation, real new assignment
  insertion, and (for second-audit failure) the first audit insertion already exist
  in the same transaction, then raise named SQLSTATE 23514. HTTP must return safe
  500 with that exact resolved SQL cause, not fail at validation or become duplicate.
- A separate advisory-lock coordinator pauses that post-write failure so a second
  real HTTP command waits behind the failing holder. PostgreSQL proves the three-node
  wait chain. After rollback the waiting command can use the original version and
  succeed; failed writes/audit do not survive.
- Actual ClubSecurity is also exercised inside an existing-style committee write
  transaction holding the granting SHARE lock. Admin HTTP revocation waits; after
  it commits, real protected round GET with the same recipient SESSION returns 403.
  This writer is an explicit transaction probe, not a new mocked HTTP endpoint.
- Futures/exceptions are collected, latches have timeouts, statements are bounded,
  workers finish before cleanup, connections are separate, and no sleep decides results.
  Fresh JDBC/new-transaction reads check database state; unrelated rows are preserved.

## Acceptance criteria → test methods

`AssignmentHttpIntegrationTest` contains **20 test invocations**:

| Coverage | Method |
|---|---|
| Concurrent duplicate appointments; one grant/audit and one safe overlap conflict | `duplicateConcurrentAppointmentsCommitExactlyOneGrantAndAudit` |
| Two Admin replacements of version 0; one replacement, stale loser, preserved history/audit/effective grant | `twoAdminsReplacingOneVersionCannotLoseUpdates` |
| Replace vs revoke, each winning order; no resurrection/lost update | `replaceAndRevokeResolveByExpectedVersionWithoutResurrection` (2) |
| Stale vs correctly versioned already-revoked conflict; GET version refresh | `staleVersionAndAlreadyRevokedAreDistinctAndDoNotWrite` |
| Failure at first/second audit after real writes; full rollback, unrelated data, successful retry | `auditFailureAfterRealReplacementWritesRollsBackAndRetrySucceeds` (2) |
| Failed holder releases locks and waiting Admin succeeds with original version | `failedHolderRollsBackBeforeWaitingAdminReplacesOriginalVersion` |
| Existing committee writer SHARE lock conflicts with Admin revoke; next permission and protected HTTP read fail | `revocationWaitsForExistingCommitteeWriterAndRemovesNextPermission` |
| Real 10s test lock timeout → 503/55P03; no data and pool/retry usable | `databaseLockTimeoutReturnsSafe503ThenPoolAndRetryWork` |
| Waiting command samples Clock only after locks, once, and starts at new server instant | `waitingAppointmentSamplesTimeAfterTheLockNotAtRequestStart` |
| Anonymous, CSRF, ordinary user, demoted/promoted Admin with old SESSION, self create/replace/revoke | `authenticationCsrfCurrentDatabaseRoleAndSelfManagementAreEnforced` |
| Inactive account/student/club, ended or future membership; deny appointment/replace, allow revoke | `ineligibleRecipientCannotBeAppointedOrReplacedButCanBeRevoked` (5) |
| Bad ID shapes/overflow, nonexistent ID, wrong-club scope | `missingWrongScopeAndMalformedIdsHaveSafeProblems` |
| Adjacent terms, distinct roles, equivalent UTC+7 instant, exact DTO allowlist/nulls | `adjacentTermsDistinctRolesAndOffsetTimestampsKeepExactHistory` |
| Strict JSON, forged system fields, time/length/blank/backdating errors, 415; no writes | `strictBodiesValidationAndMediaErrorsDoNotWrite` |

Other tests:

- `AssignmentRequestsTest`: **22 invocations**, nonnegative int64 JSON versions,
  system-field rejection, explicit-offset/date/year/precision errors, optional
  server start and timeout bounds.
- `AssignmentServiceTest`: **7 invocations**, only named overlap constraints and
  lock SQL states map to domain/dependency errors; unrelated integrity errors
  propagate. These mocks are only classifier unit tests.
- `AssignmentInvariantIntegrationTest`: **3 real PostgreSQL tests**, listed above.
- Existing `CommitteeRevocationConcurrencyIntegrationTest` continues to pass as
  part of full verify; no duplicate implementation or reduced assertions.

## Actual check results

Java 21; disposable database bound to a random loopback port. Existing user demo
app/database containers and ports were untouched.

| Check | Passed | Failed / errors | Not run / skipped |
|---|---:|---:|---:|
| Focused four Task78 classes | 52 | 0 / 0 | 0 |
| `./mvnw clean verify`, PostgreSQL 18 (CI backend version) | 583 | 0 / 0 | 0 |
| `./mvnw clean verify`, PostgreSQL 17-alpine (Compose/integration CI), final source | 583 | 0 / 0 | 0 |
| Seven selected concurrency invocations repeated **3 times**, PostgreSQL 18 | 21 | 0 / 0 | 0 |
| Task55 seed applied twice + verification SQL, PostgreSQL 18 | Passed | 0 | 0 |
| Task55 seed applied twice + verification SQL, PostgreSQL 17 | Passed | 0 | 0 |
| Redocly both specifications, repo config | Valid | 0 errors; 9 existing warnings | 0 |
| Duplicate-key YAML, OpenAPI schema and refs, 29 OpenAPI examples, 7 Markdown examples, DTO allowlists | Passed | 0 | 0 |
| Existing operations/schemas/security preserved outside Task78 additions and Problem reason documentation | Passed (structural comparison against HEAD) | 0 | 0 |
| DBML → temporary PostgreSQL SQL using @dbml/cli | Passed | 0 | 0 |
| `git diff --check`, including untracked new text | Passed | 0 | 0 |
| GitHub Actions, team review, deployment, combined Task52/65/78 branch | — | — | **Not run / not performed** |
| Frontend lint/test/build | — | — | **Not run: no frontend changes** |

The expected pre-V4 failures above are separate from these final green results.
An early regression run had 534 tests (baseline plus 3 invariant tests), before
HTTP/unit classes were added; the final result is 583, not that early count.

All 20 HTTP cases assert zero active pooled connections after fixture cleanup.
After final verification, database checks found **0 task78-* users** and **0
failure-trigger functions**. Disposable test containers and private credential
files/runners were removed after checks; build reports and non-secret logs remain.

Local evidence logs in `/private/tmp/`:
`clubhub-task78-before.log`, `clubhub-task78-invariants.log`,
`clubhub-task78-focused.log`, `clubhub-task78-verify.log` (18),
`clubhub-task78-final17.log`, `clubhub-task78-repeat-{1,2,3}.log`,
`clubhub-task78-seed18.log`, `clubhub-task78-seed17.log`,
`clubhub-task78-openapi.log`, `clubhub-task78-contract-check.log`,
`clubhub-task78-dbml.log`. Final Surefire XML/Jacoco/JAR are under `backend/target/`
and excluded from git. Python validators used a disposable external venv; its
RefResolver deprecation and system LibreSSL warnings do not indicate spec failures.

### Reproduce

Use the repository's PostgreSQL setup and Java 21. Set `DB_PASSWORD`,
`SEEDTEST_DATABASE_URL` and `ROUNDS_TEST_DATABASE_URL` privately for a disposable
database. Do not put credentials in tracked files or command logs. From `backend/`:

```sh
./mvnw -Dtest=AssignmentRequestsTest,AssignmentServiceTest,AssignmentInvariantIntegrationTest,AssignmentHttpIntegrationTest test
./mvnw clean verify
```

Selected repeat command (7 invocations per run):

```sh
./mvnw '-Dtest=AssignmentHttpIntegrationTest#duplicateConcurrentAppointmentsCommitExactlyOneGrantAndAudit+twoAdminsReplacingOneVersionCannotLoseUpdates+replaceAndRevokeResolveByExpectedVersionWithoutResurrection+failedHolderRollsBackBeforeWaitingAdminReplacesOriginalVersion+revocationWaitsForExistingCommitteeWriterAndRemovesNextPermission+waitingAppointmentSamplesTimeAfterTheLockNotAtRequestStart' test
```

From repository root:

```sh
npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml
npx --yes --package @dbml/cli dbml2sql docs/database/TU-ClubHub-ERD-Updated.dbml --postgres -o /tmp/task78-erd.sql
git diff --check
```

## Rollout and reviewer checklist

- V4 needs `btree_gist`; migration role must have database CREATE privilege or DBA
  provisioning. PostgreSQL documents combining scalar and range exclusion constraints
  [here](https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT)
  and trusted extensions [here](https://www.postgresql.org/docs/18/contrib.html).
- Check real existing unrevoked term overlaps before deployment. V4 intentionally
  fails rather than choose a grant to revoke or rewrite history. Existing appointment
  reasons remain null; do not fabricate historical audit events.
- Confirm endpoint naming and the 2s operational lock timeout. No business policy
  remains silently assumed: role/term/self-management/eligibility are from the matrix;
  new HTTP scope was explicitly authorized. Formal team review is still required.
- Verify create, replacement and revoke requests as different real Admins; inspect
  root reasons, old/new IDs, versions and durable audit. Existing recipient session
  should lose effective grant at its next check after revocation commits.
- Bootstrap membership, lifecycle revoke on LEFT/REMOVED, separate PRESIDENT guards,
  global-role management, dashboards and UI are outside this change.
- Task52 and Task65 stay uncommitted in separate worktrees based on the same main.
  Future combined integration must preserve both club POST and GET paths and add
  both application controllers to their shared scoped advice; their combined build
  has **not** been run. Task78 advice is scoped separately and does not edit that handler.

## Proposed focused commits (not executed)

```text
feat(auth): add safe committee assignments
test(auth): cover concurrent assignment changes
docs(api): define admin assignment contracts
```

First commit: production Java plus V4; second: the four tests; third: OpenAPI and
matching Markdown, DBML, README, policy/card handoff and test evidence. Each header
is English Conventional Commits, imperative, no final period, ≤50 characters.

## Prepared PR text (not created)

**Title:** Task78: add safe Admin committee assignments

### Task78 — AUTH-04

- Add authenticated Admin create/read/replace/revoke API using current database role
  and self-management restrictions from the permission matrix.
- Combine recipient/assignment row locks with client expected versions; reject stale
  intent without automatic retry. Preserve old terms via revoke-and-create.
- Add V4 active-term unique/exclusion constraints and durable reason/audit storage.
- Prove actual concurrent HTTP transactions, duplicate prevention, stale conflicts,
  post-write rollback, waiting retry, revocation permission effect and safe timeout.
- Keep private applicant contents out of Admin DTOs and document exact errors/time rules.

### Verification

- Full verify: 583 passed on PostgreSQL 18 and PostgreSQL 17-alpine, zero skipped.
- Task78 focused: 52 passed; 7 concurrency invocations ×3 repeats passed.
- Seed 2-pass and integrity verification passed on both databases.
- OpenAPI and DBML validation passed; 9 existing OpenAPI warnings, no errors.
- YAML/refs and 29 OpenAPI/7 Markdown examples passed; git diff check passed.

### Review / operations

- Requires btree_gist privilege/provisioning and preflight of existing term overlaps.
- No frontend changes; no bootstrap/global-role/member lifecycle implementation.
- Local results only; GitHub CI and reviewer approval await actual publication.
- Base: main at e2712a9; independent of the uncommitted Task52/65 worktrees.
