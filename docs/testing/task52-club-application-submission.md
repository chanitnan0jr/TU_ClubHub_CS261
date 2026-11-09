# Task52 — Club application submission

> For the latest 2026-11-09 QA findings, authorized timestamp fix and verification,
> see [QA Task52](qa-task52.md#authorized-qa52-001-fix--2026-11-09). The implementation
> checks dated 2026-11-08 below are historical.

## Scope and baseline

- Branch: `feat/club-application-submission`; base: `main` at `e2712a9`,
  fetched and fast-forward pulled on 2026-11-08. Working tree was clean.
- No `AGENTS.md` was found in the repository or applicable ancestor directories.
  Followed `COMMIT_RULES.md`, existing JDBC architecture and CI setup.
- Task75 design and application tables exist in main. Task51 is merged in
  `db0ae6e` (PR #69), including shared round/question locks. No stacked base is needed.
- Reused Task42/43/45 submission validation, repository writes, transaction,
  session/CSRF filters, duplicate constraint and HTTP concurrency fixtures.
- No migration, frontend logic, upload/storage operation or seat quota added.

## Contract decision and behavior

The task card requests `POST /api/v1/clubs/{id}/applications`; Task42 and the
existing frontend use `POST /api/v1/rounds/{roundId}/applications`. On 2026-11-08
the requester explicitly confirmed **adding the club route with required body
`roundId` while retaining the round route**. Neither endpoint selects a round
implicitly. See [API §11.1](../api/API_v1.md#111-club-scoped-submission-task52)
and `submitClubApplication` in [OpenAPI](../api/openapi.yaml).

Both routes return `201` with `{id, clubId, roundId, status, submittedAt}`,
`status: SUBMITTED`, `Location: /api/v1/me/applications/{id}` and
`Cache-Control: no-store`. `Pending` is only a display label; there is no new
`PENDING` database state. The receipt is returned after the service proxy commits.

The club route validates decimal-string club/round IDs and verifies the round
belongs to the path club. Wrong club, absent/inactive club, absent/DRAFT or
never-published round use the same safe `404 RESOURCE_NOT_FOUND`. Other business
rules and errors remain those of the existing submission contract.

Applicant identity comes from the authenticated session. Existing user/profile
data is referenced by the application, not overwritten or copied from client
fields. Document attachments are validated HTTPS URLs/labels in
`application_links`. There are no uploaded-file reference IDs or external
storage side effects in the current model, so attachment ownership by reference
is not an applicable test. Only TEXT questions exist; no option schema is added.

## Changed files

Paths below are relative to the repository root.

| Area | Files and purpose |
|---|---|
| HTTP | `backend/src/main/java/com/tu/clubhub/application/controller/ClubApplicationController.java`: club POST; `ApplicationExceptionHandler.java`: reuse the same Problem handling for both controllers |
| Request DTOs | `application/dto/ClubApplicationSubmissionRequest.java`: strict envelope with explicit round; `ApplicationSubmissionRequest.java`: share strict nested content parsing without relaxing the old envelope |
| Service | `application/service/ApplicationService.java`: additional transactional entry point and verified club scope; one shared persistence flow |
| Validation | `application/service/ApplicationSubmissionValidator.java`: same positive BIGINT validation for club and round IDs |
| Repository | `application/repository/ApplicationRepository.java`: scope the locked round query by both round and club; reuse existing inserts and unique constraint |
| Tests | `backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java`, `ApplicationSubmissionValidatorTest.java`: extend existing tests instead of duplicating the fixture/concurrency framework |
| Contract | `docs/api/openapi.yaml`, `docs/api/API_v1.md`: new operation/schema, shared success response and compatibility decision |
| Handoff | `docs/architecture/task75-sprint2-design.md`, `README.md`, this report |

The abbreviated `application/...` production paths in the table are under
`backend/src/main/java/com/tu/clubhub/`.

## Acceptance criteria → tests

Methods below are in `ApplicationSubmissionHttpIntegrationTest` unless noted.
Existing sensitive cases are parameterized with `clubScoped=false/true` to
exercise both HTTP entry points through real security, service and PostgreSQL.

| Requirement | Test methods and assertions |
|---|---|
| Success, all writes and initial SUBMITTED history | `clubSubmissionSelectsRequestedRoundAtOpeningWhenSeveralRoundsAreOpen`; shared `assertComplete` checks receipt fields, applicant/club/round IDs, motivation, persisted status/version/time, answer IDs/text, link label/URL/order, one history with null previous status/reason, actor and matching time |
| Authentication, server identity, CSRF | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity`: anonymous 401, CSRF 403, forged identity 400, no writes |
| Session/account/student eligibility | `expiredAndSuspendedSessionsCannotSubmitAndAreInvalidated`, `accountStatusIsRecheckedUnderLockAfterHttpPreflight`, `clubSubmissionRequiresVerifiedActiveStudent` |
| Missing/wrong/inactive resource and round window | `clubSubmissionChecksRoundOwnershipVisibilityAndWindow`: 10 scenarios, including future, exact/after close, manual close and cancellation; correct Problem and empty database state |
| Explicit selection with several open rounds | `clubSubmissionSelectsRequestedRoundAtOpeningWhenSeveralRoundsAreOpen`, `sameStudentCanSubmitToDifferentRoundsConcurrently` |
| Club ID and body types | `clubSubmissionRejectsInvalidClubIds` (6 inputs), `clubSubmissionValidatesItsEnvelopeWithoutCoercion` (8 scenarios) |
| Required/blank/foreign/duplicate questions | `clubSubmissionValidatesCurrentQuestionSetBeforeWriting` (4 scenarios); existing `ApplicationServiceIntegrationTest` also tests per-question length and optional omission |
| Invalid URL and indexed errors | `invalidHttpsUrlHttpErrorMatchesOpenApiExample`, `wrappedDtoValidationPreservesIndexedFieldErrors`; URI scheme/host tests reused in `ApplicationSubmissionValidatorTest` |
| Strict envelope and nested objects | `ApplicationSubmissionValidatorTest.clubRequestSelectsRoundAndReusesStrictNestedContentParsing`: unknown identity/attachment/option fields and coercion rejected, including with a permissive mapper; old round route still rejects body roundId |
| Concurrent duplicate | `sameStudentConcurrentHttpSubmissionsCommitExactlyOnce`, `sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce`: one 201, remaining 409 APPLICATION_ALREADY_EXISTS, one application/answer set/link/history |
| Duplicate protection across endpoints | `clubAndRoundRoutesSubmittingConcurrentlyCommitExactlyOnce`; `bothSubmissionRoutesShareDuplicateIdentityAndPreserveExistingRows` tests sequential reuse in both directions with unchanged row snapshots |
| Recheck after lock wait | `waitingHttpRequestRechecksClosingTimeAfterRoundLock`: both routes, exact closing and after closing, controlled Clock, no writes |
| Real rollback and retry | `injectedWriteFailureRollsBackAndSameStudentCanRetry`: both routes, answer/history failure after prior database writes, 500 safe Problem, no partial rows, retry succeeds, unrelated data preserved |
| Rollback releases lock | `failedHttpLockHolderRollsBackAndWaitingRetrySucceeds`: both routes, waiting request succeeds after holder failure, separate transaction IDs and no orphan rows |

## PostgreSQL and concurrency proof

- Dedicated local PostgreSQL **18** container; no H2 or repository/service mocks
  for these HTTP tests. It is separate from the user's demo database.
- Fixtures commit before worker threads. There is no outer test transaction.
- Existing Hikari pool size 12 is sufficient for five workers plus coordinator.
- `MockMvc` runs the actual filters, JDBC session authentication and service proxy.
- Bounded latches and the controlled Clock hold the first transaction while the
  others enter. `pg_blocking_pids` proves real overlap and database blocking;
  each worker's backend PID and transaction ID must differ. No timing sleeps.
- Failure injection uses a **test-only PostgreSQL trigger**. Its preconditions
  prove the application and first answer already exist for answer failure,
  or both answers and the link already exist for history failure. Exact test
  constraint/SQLSTATE proves the intended stage, not an early validation error.
- All worker results/exceptions are collected; locks are released in `finally`.
  Database checks run after transactions finish; cleanup removes test rows,
  sessions, trigger/function and verifies no pooled connection remains active.
- Existing exact-constraint duplicate translation is retained; arbitrary database
  failures are not converted into duplicate or membership-limit conflicts.

## Actual local verification — 2026-11-08

Environment: Temurin Java 21, PostgreSQL 18; dedicated ephemeral database and
private environment file. No credentials are committed or printed.

| Command/check | Actual result |
|---|---|
| Baseline `./mvnw clean verify` before edits | **531 passed**, 0 failures/errors/skipped |
| `./mvnw -Dtest=ApplicationSubmissionValidatorTest,ApplicationSubmissionHttpIntegrationTest test` | **111 passed**: 39 validator cases + 72 HTTP cases; 0 failures/errors/skipped |
| Selected concurrency/rollback methods repeated three additional times | **15/15 passed per repetition**, 45 executions total; 0 failures/errors/skipped |
| Final `./mvnw clean verify` | **578 passed**, 0 failures/errors/skipped; packaged Spring Boot JAR and generated JaCoCo report |
| CI command: `npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml` | Valid, 0 errors; 9 pre-existing warnings (baseline main also 9) |
| Temporary `openapi-spec-validator`, YAML parsing and JSON Schema example check | Both documents valid (3.1.0 / 3.0.3); 11 request/response examples reachable from the new operation checked; missing roundId/internal fields rejected |
| `git diff --check` | Passed |

The repeated-method selector is:

```text
ApplicationSubmissionHttpIntegrationTest#sameStudentConcurrentHttpSubmissionsCommitExactlyOnce+sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce+clubAndRoundRoutesSubmittingConcurrentlyCommitExactlyOnce+injectedWriteFailureRollsBackAndSameStudentCanRetry+waitingHttpRequestRechecksClosingTimeAfterRoundLock+failedHttpLockHolderRollsBackAndWaitingRetrySucceeds
```

**Failed final checks:** none. **Not run:** frontend checks (no frontend changes),
GitHub Actions (not pushed), reviewer/PO acceptance (not performed). An initial
optional Python validator environment lacked PyYAML; a fresh temporary virtualenv
was installed and the final validation above completed successfully.

To reproduce, use PostgreSQL 18 as in `.github/workflows/ci.yml`, set `DB_PASSWORD`
privately, and set `SEEDTEST_DATABASE_URL` and `ROUNDS_TEST_DATABASE_URL` to the
test database if its host/port differs from the repository defaults. Then run
the Maven commands above from `backend/`. Never use a shared production database.

## Review handoff / prepared PR text

**PR title:** `feat(api): add club application submission`

**Base:** `main`. No Task52 commit, push or PR has been made.

### Task52 — APP-01

- Add `POST /api/v1/clubs/{id}/applications` with required body `roundId`.
- Retain the existing round POST and frontend consumer unchanged; verify the
  selected round belongs to the path club and share the atomic submission flow.
- Reuse session/CSRF eligibility, TEXT/HTTPS validation, SUBMITTED history,
  database unique constraint, locks and safe Problem handling.
- Cover real HTTP concurrency across both routes, scoped IDs, strict body fields,
  post-write rollback/retry and preservation of unrelated data.
- Update OpenAPI and Markdown together, documenting the requester-confirmed
  route addition and pending team review.

**Validation:** backend verify 578 passed; focused 111 passed; concurrency/rollback
15 passed × 3 repetitions; OpenAPI valid with 9 existing warnings; diff check clean.
GitHub Actions must be checked after a future push; local success is not CI success.

**Reviewer walkthrough:** compare §11.1 with the new operation; exercise an
authenticated student's valid request, wrong-club round, and duplicate through
the other route; inspect the HTTP tests' database snapshots and overlap proof.

**Pending review:** PO/team review of the additional route is not completed.
The requester resolved round selection explicitly; no unresolved seat quota,
PENDING status or uploaded-reference ownership rule is being assumed.

### Proposed focused commits (not created)

1. `feat(api): add club application submission` — production controller/DTO,
   service, repository and shared exception handling.
2. `test(api): cover submission and rollback` — extended validator and HTTP tests.
3. `docs(api): define club submission contract` — OpenAPI + Markdown contract,
   related design/README notes and this verification/review handoff.

All subjects are English Conventional Commits and at most 50 characters.
