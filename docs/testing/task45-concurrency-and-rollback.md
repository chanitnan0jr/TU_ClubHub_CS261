# Task45-BE-1 / BE-2 — HTTP concurrency and rollback

## Scope and decisions

**Later review follow-up:** [Application submission PR review fixes](application-submission-review-follow-up.md) supersedes the original timeout-injection setup described below: the HTTP timeout test now relies on the production transaction-local lock timeout, and new account-before-body / metadata regressions have been added. The 355-test results in this report are the historical Task45 results.

Checked on **2026-10-21**, starting from `b49d49d` on `feat/application-submission`. The working tree was clean. No `AGENTS.md` was found in the repository or its ancestors. Follow [COMMIT_RULES.md](../../COMMIT_RULES.md), [Task42 contract §11](../api/API_v1.md#11-application-submission), [OpenAPI](../api/openapi.yaml), and the [Task43 handoff](task43-application-submission.md).

The requester explicitly confirmed:

1. Keep the existing rules: database/API status **SUBMITTED**, displayed as Pending. Initial history is `NULL → SUBMITTED`, not a persisted `PENDING` value.
2. The limit is five effective distinct-club memberships per student. Submission creates no membership. Pending applications consume no quota. There is **no per-round seat capacity**, including no meaning for `0`/`null` capacity.
3. Add the missing production POST Controller and error handler according to Task42, then test that real HTTP boundary. This is an explicitly approved addition to the original tests/bug-fixes scope. No test-only submission endpoint is used.

No contract rules, OpenAPI schemas, migrations, Service locking/transaction behavior, or Security configuration were changed. GET application-form remains unimplemented; it is outside this task. No commit or push was performed.

## Files

| File | Purpose |
|---|---|
| [ApplicationController.java](../../backend/src/main/java/com/tu/clubhub/application/controller/ApplicationController.java) | POST `/api/v1/rounds/{roundId}/applications`; invokes the existing transactional Service; returns `201`, receipt, Location and no-store only after commit |
| [ApplicationExceptionHandler.java](../../backend/src/main/java/com/tu/clubhub/application/controller/ApplicationExceptionHandler.java) | Scoped HTTP errors using shared Problem fields plus the documented conflict reason; strict JSON validation; sanitized unexpected errors; suspended-session invalidation |
| [ApplicationService.java](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationService.java) | Comment updated to reflect the Controller; executable code unchanged |
| [ApplicationSubmissionHttpIntegrationTest.java](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java) | New HTTP/PostgreSQL tests extending Task43's existing Service coverage |
| [API_v1.md](../api/API_v1.md) | Implementation-status inventory updated; contract unchanged |
| This report | Case mapping, evidence, setup and limitations |

Existing `ApplicationServiceIntegrationTest` and `ApplicationSubmissionValidatorTest` remain unchanged. Their 89 executions cover Service/validation behavior; the new suite covers the real HTTP/security/transaction path rather than duplicating those tests in another Service suite.

## HTTP and security

MockMvc runs the real DispatcherServlet handlers and enabled Spring Security/Spring Session filters. Each client bootstraps CSRF through GET `/auth/csrf`, logs in through POST `/auth/login`, and submits with the resulting JDBC `SESSION` cookie and fresh `X-CSRF-TOKEN`. Only the **external TU provider** is replaced with a test-only fixture allowlist. AuthController, LoginService, user provisioning, session persistence, ApplicationService and ApplicationRepository are real. Neither Service nor Repository is mocked.

The new Controller delegates to the Spring transactional proxy. The shared error shape is reused through `ProblemResponse`; a scoped wrapper adds `reason` only when present. Known application exceptions retain status/code/reason/fieldErrors. The original SQL exception remains internal for diagnostics. Unexpected writes map to sanitized `500 INTERNAL_ERROR`, not duplicate/quota conflicts. Existing transient lock failures from the Service retain `503 SERVICE_UNAVAILABLE`. Connection/start-transaction failures also map to 503. Authentication and authorization exceptions remain owned by Security. No new public permission is added: the existing authenticated rule and CSRF enforcement protect POST.

## Case-to-method mapping

All methods below are in `ApplicationSubmissionHttpIntegrationTest`.

| Requested case | Method | Meaning |
|---|---|---|
| CONCURRENT-01 | `sameStudentConcurrentHttpSubmissionsCommitExactlyOnce` | Two authenticated sessions for one student: one 201, one 409 APPLICATION_ALREADY_EXISTS; one application, distinct answers, one initial SUBMITTED history |
| CONCURRENT-02 | `eligibleStudentsWithFourMembershipsCanSubmitTogether` | **Seat-capacity expectation is not applicable.** Under the confirmed contract, two eligible students with four memberships each both succeed; no memberships are created |
| CONCURRENT-03 | `severalEligibleStudentsHaveOverlappingHttpTransactions` | **“More than remaining seats” is not applicable.** Five eligible students all succeed with distinct applications, answers/history and no orphans |
| CONCURRENT-04 | `waitingHttpRequestRechecksClosingTimeAfterRoundLock` | Real round lock blocks HTTP request before Clock is read; advance Clock to closesAt, release lock, expect 409 ROUND_CLOSED and no writes |
| ROLLBACK-01 | `injectedWriteFailureRollsBackAndSameStudentCanRetry("answer")` | Inject failure on second answer after application and first answer were actually inserted; 500 and rollback all new rows |
| ROLLBACK-02 | `injectedWriteFailureRollsBackAndSameStudentCanRetry("history")` | Inject failure before initial history, after application, both answers and link were inserted; 500 and rollback all |
| ROLLBACK-03 | Both invocations of `injectedWriteFailureRollsBackAndSameStudentCanRetry` | Same student retries while the scoped trigger remains installed; valid payload succeeds and unrelated committed rows remain byte-for-value equivalent |
| ROLLBACK-04 | `failedHttpLockHolderRollsBackAndWaitingRetrySucceeds` | **Seat aspect not applicable.** First HTTP transaction holds locks after real writes then fails; waiting HTTP request succeeds after rollback; only its complete submission remains |
| HTTP authentication/CSRF | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity` | Anonymous with valid CSRF gets 401; missing CSRF gets 403; client applicantId gets 400; no writes |
| HTTP session lifecycle | `expiredAndSuspendedSessionsCannotSubmitAndAreInvalidated` | Expired session gets 401; newly suspended account gets 403 ACCOUNT_NOT_ALLOWED; both sessions invalidated, no writes |
| HTTP error contract | `malformedBodyAndIdUseContractProblemsAndUnsupportedMediaRetains415` | Malformed JSON and invalid decimal ID return shared 400 errors; unsupported media retains 415 |

The seat cases are **not counted as passed or skipped tests**. Their alternative scenarios verify the confirmed membership-based contract. The expanded suite has 15 executions, including two rollback stages and two deadline boundaries.

### Expanded QA checklist (C-01–07 / R-01–07)

The follow-up checklist was compared with the existing tests, and missing HTTP coverage was added without changing production behavior. The pending Task45 work was preserved; this follow-up changes only the HTTP test suite and this report.

| Case | Evidence / expected result under the confirmed contract |
|---|---|
| C-01 | `sameStudentConcurrentHttpSubmissionsCommitExactlyOnce`: one 201 and one documented duplicate 409 |
| C-02 | `sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce`: five requests with the **same SESSION cookie**, five distinct DB transactions/connections, one 201 and four duplicate 409 responses; exactly one application, two distinct answers (one answer set), one link and one initial history |
| C-03 | Not applicable: no last-seat/round-capacity rule in Task42/schema. `eligibleStudentsWithFourMembershipsCanSubmitTogether` proves the actual membership limit permits both eligible students |
| C-04 | Not applicable: no three-seat capacity to enforce. Multiple eligible students must not be rejected using an invented quota |
| C-05 | `sameStudentCanSubmitToDifferentRoundsConcurrently`: same student, two rounds of the same club, overlapping real transactions; two 201 responses with distinct application IDs, correct round/question IDs and one initial SUBMITTED history per application. Once-per-round contract permits this |
| C-06 | `waitingHttpRequestRechecksClosingTimeAfterRoundLock(60)` and `(61)`: exactly closesAt and after closesAt, respectively; both return 409 ROUND_CLOSED without writes |
| C-07 | `realHttpLockTimeoutReturns503AndPoolAcceptsRetry` and `realHttpDeadlockVictimReturns503AndPoolAcceptsRetry`: actual SQLSTATE 55P03 / 40P01, documented 503 response with no SQL details or conflict reason, no partial writes, successful retry and restored transaction-local timeout settings |
| R-01 / R-02 | `injectedWriteFailureRollsBackAndSameStudentCanRetry("answer")`: real application and first answer are visible to the trigger before second answer fails; all rollback |
| R-03 | `injectedWriteFailureRollsBackAndSameStudentCanRetry("history")`: application, both answers and link exist before the injected history failure; all rollback |
| R-04 | Both injected-stage invocations retry successfully with the same student; trigger stays installed and scopes failure to the faulty payload |
| R-05 | Seat aspect not applicable. `failedHttpLockHolderRollsBackAndWaitingRetrySucceeds` proves rollback releases locks, the waiting request succeeds and failed request rows do not remain |
| R-06 | Rollback tests now seed a committed application belonging to **another student**, including an answer, link and history. All four snapshots must be nonempty and unchanged after failure and retry |
| R-07 | Retry after answer/history failure, timeout and deadlock succeeds. Each test's cleanup also asserts that Hikari has **zero leased connections** and all tracked fixture users were removed |

The QA word `PENDING` continues to mean the UI label only. Every successful test asserts the actual contract value `SUBMITTED`; changing that expected value to PENDING would contradict the existing database constraint.

## Deterministic concurrency proof

- Tests have **no outer test transaction**. JDBC fixtures and all login transactions commit before worker threads start.
- The pool has 12 connections, sufficient for five workers plus the coordinator/session queries. Test-only connection acquisition and SQL execution timeouts bound failure paths; production settings are untouched.
- Worker requests use separate threads. A latch holds the first request inside its real Service transaction, after it owns the round lock. Other workers start behind a ready/start latch.
- The test Clock queries `pg_backend_pid()` and `txid_current()` through the transaction-bound JdbcTemplate. Every overlapping request must have a distinct PID and transaction ID; sampling the Clock twice fails the test.
- The coordinator follows the actual PostgreSQL wait graph with `pg_blocking_pids()`. It must observe all other requests blocked behind the first transaction while **all futures are unfinished**. A sequential execution cannot satisfy these assertions.
- Once all waiters are proven, release the latch and read every Future. Responses and committed DB rows are checked together. Unexpected worker exceptions fail the test. No sleep or wall-clock admission window is used.
- The deadline test uses a coordinator-held round lock. The Clock has no request visit while blocked; it moves directly to `closesAt`, then the lock is released. The eventual worker PID must match the observed waiter.
- JDBC assertions run after request transactions finish; `targetRows` explicitly opens a new transaction and uses no persistence-context cache.
- Cleanup deletes only tracked fixture users/clubs/rounds, their application children, test sessions and the scoped test trigger/function. The temporary PostgreSQL instance is separate from the user's existing database.
- The C-07 tests register a **test-only TransactionExecutionListener** on the real transaction manager. It runs only for `ApplicationService.submit` on the worker thread, after that transaction begins. `SET LOCAL` supplies the timeout and optional pre-lock used for fault injection. There is no outer transaction around MockMvc, no replacement Service, and no production test flag. The listener is removed after every test.
- For the deadlock test, a coordinator transaction deliberately takes locks in reverse order (round then applicant), while the real HTTP transaction pre-locks the applicant and then enters the real Service. The coordinator's blocked PID is observed before allowing the Service to request the round lock. PostgreSQL chooses the HTTP transaction as the deadlock victim; both worker futures complete within bounded timeouts. This demonstrates error recovery from an externally induced cycle, not a claim that normal Service lock ordering deadlocks by itself.

Example from the first successful local run:

```text
Two requests: PID 100 / tx 799 and PID 102 / tx 800; one observed DB waiter
Five requests: five distinct PIDs (100, 102, 103, 104, 105); four observed DB waiters
Rollback overlap: holder PID 102 / tx 846; waiter PID 100 / tx 847
```

These numbers identify that run only; they are not stable expected IDs or sequence-continuity assertions.

## Failure injection and rollback proof

The suite temporarily installs a PostgreSQL trigger/function, scoped to the fixture round/applicant and motivation `injected-failure`. It is never a production migration, endpoint or flag.

- **Answer stage:** before the second answer insert, the trigger requires the parent application to exist with SUBMITTED and exactly one earlier answer to be visible in the same transaction.
- **History stage:** before the history insert, it requires the parent application, both answers and one link to exist in that transaction.
- If these prior-write checks fail, PostgreSQL raises **a different constraint name** (`task45_wrong_stage`). Only after the checks pass does it raise SQLSTATE `23514` with `task45_injected_answer` or `task45_injected_history`. The test checks the actual `PSQLException` server constraint field, not a generic exception or status alone. Validation failure cannot satisfy this proof.
- For the failed-holder scenario, the history trigger also waits on a test advisory lock **after** verifying prior writes. The coordinator observes this wait, starts a second authenticated request, observes it blocked behind the failing transaction, and releases the advisory lock. The first request returns 500 after rollback; the waiter returns 201.
- Verify absence/presence of applications, answers, links and history from fresh reads after completion, with orphan checks. A separately committed application for another student in another round, including its answers/link/history, must remain unchanged. No assertion expects sequence IDs to be reused or consecutive.

## Bugs and changes

No defect in Task43's transaction proxy, lock scope, unique constraint handling or rollback implementation has been demonstrated by these tests. Consequently, no Service/Repository executable code or database constraint was changed and no `fix` commit is proposed.

The missing HTTP handler was identified during source inspection, reported, and added with explicit requester approval. This is feature completion, not a claimed reproduction/fix of an existing locking bug. The first compilation of the new test exposed three checked-exception declarations in a response-text helper; the helper was corrected before tests could execute. That test compilation issue is not reported as an application failure or a passing integration run.

## Running checks

Use a dedicated PostgreSQL test database. CI uses **PostgreSQL 18** and **Temurin JDK 21**. Set `DB_PASSWORD` privately; never commit it. The URL overrides must point at that same test database (adjust host/port for your machine):

```bash
cd backend
export SEEDTEST_DATABASE_URL='jdbc:postgresql://localhost:5433/tu_clubhub_test'
export ROUNDS_TEST_DATABASE_URL="$SEEDTEST_DATABASE_URL"

./mvnw -Dtest=ApplicationSubmissionHttpIntegrationTest test
./mvnw -Dtest=ApplicationSubmissionHttpIntegrationTest,ApplicationServiceIntegrationTest,ApplicationSubmissionValidatorTest test
```

Repeat the same nine concurrency methods (10 executions, because the deadline test has two boundaries) sequentially, without parallel Maven processes on the same database:

```bash
for run in 1 2 3 4 5; do
  ./mvnw '-Dtest=ApplicationSubmissionHttpIntegrationTest#sameStudentConcurrentHttpSubmissionsCommitExactlyOnce+sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce+sameStudentCanSubmitToDifferentRoundsConcurrently+eligibleStudentsWithFourMembershipsCanSubmitTogether+severalEligibleStudentsHaveOverlappingHttpTransactions+waitingHttpRequestRechecksClosingTimeAfterRoundLock+failedHttpLockHolderRollsBackAndWaitingRetrySucceeds+realHttpLockTimeoutReturns503AndPoolAcceptsRetry+realHttpDeadlockVictimReturns503AndPoolAcceptsRetry' test || break
done

./mvnw clean verify
git diff --check
```

### Local results

Ran locally on **2026-10-21**, using Temurin JDK 21 and a new, isolated PostgreSQL 18 container. The user's existing PostgreSQL 16 container on port 5433 was untouched. The isolated container and its generated credential file were removed after verification.

| Check | Passed | Failed / errors | Skipped |
|---|---:|---:|---:|
| Expanded HTTP suite | 15 | 0 | 0 |
| HTTP + existing Service + validator suites | 104 | 0 | 0 |
| Nine concurrency methods (10 executions), repeated sequentially five times | 50 executions (5/5 runs) | 0 | 0 |
| `./mvnw clean verify` | 355 | 0 | 0 |

The final build produced the Spring Boot JAR and JaCoCo report with **BUILD SUCCESS**. Surefire records 52 Service executions, 37 validator executions and 15 HTTP executions. These counts overlap with the full suite; do not add them together as distinct tests. The intentionally injected HTTP 500/503 responses are expected assertions in passing recovery tests, not unreported build failures. The earlier 350-test/25-repeat results describe the smaller pre-checklist suite and are superseded by these expanded results.

After the final verification, a separate PostgreSQL query found **zero** Task45 fixture users, clubs, rounds and categories, and zero `task45_fail_write` functions / `task45_write_failure` triggers. Each test also verified that Hikari had zero leased connections after cleanup. The new HTTP lock/deadlock cases passed on their first execution; no new implementation bug was found and no production change was needed for the expanded checklist.

`git diff --check` passed. Each new, untracked file was also checked for whitespace without staging it; report links and commit-subject lengths were checked. Changes are limited to the six files listed above. No tests were disabled, skipped or weakened, and no unrelated configuration/files were changed.

**Not run:** GitHub Actions, frontend checks (frontend unchanged), deployed-server/network-client testing, PO/QA review. MockMvc proves the HTTP test layer, not a separately deployed server. Seat-capacity scenarios cannot be tested as stated because that feature is absent from the confirmed contract/schema; their applicable alternatives and limits are documented above. No current backend check remains blocked by the local environment.

## Focused commit suggestions

Both subjects follow Conventional Commits, use English imperative phrasing, and are at most 50 characters:

1. `feat(api): expose application submission` — Controller, scoped error handler, Service comment and API implementation-status inventory.
2. `test(api): verify submission concurrency` — HTTP/PostgreSQL tests and this report.

No bug-fix commit is suggested without a demonstrated production bug.
