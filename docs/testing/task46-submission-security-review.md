# Task46:U03-BE-1 — Application submission security and transaction review

Scope: `POST /api/v1/rounds/{roundId}/applications` and `GET /api/v1/rounds/{roundId}/application-form` as implemented on `main`, against [API v1 §11–§12](../api/API_v1.md#11-application-submission). Code by tong-ari-krit (PR #55). Reviews by chanitnan0jr: the PR #55 comment on `b49d49d` (2026-10-20) and the review of `1053c14` (2026-10-29). Evidence is the code and the named tests, which run in CI against PostgreSQL.

## Checks

| Area | Result | Evidence |
|---|---|---|
| Identity | The applicant is the session user; a client `applicantId` is rejected as an unknown field | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity` |
| Session and CSRF | No session → 401; missing CSRF → 403 `CSRF_INVALID`; an expired session is invalidated | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity`, `expiredAndSuspendedSessionsCannotSubmitAndAreInvalidated` |
| Account | A suspended account gets 403 `ACCOUNT_NOT_ALLOWED` and loses its session before the body is read (`ActiveAccountFilter`); the write transaction rechecks it under a row lock | `suspendedAccountPrecedesBodyAndIdValidationAndInvalidatesSession`, `accountStatusIsRecheckedUnderLockAfterHttpPreflight` |
| Eligibility and visibility | Verified ACTIVE student required, ADMIN included; a missing, never-published or inactive-club round is 404 | `rejectsInactiveOrMissingStudentProfileEvenForAdmin`, `hidesMissingRoundInactiveClubAndNeverPublishedRound` |
| Input | Strict JSON DTOs; required and blank text, lengths, foreign or duplicate question IDs, HTTPS-only links without userinfo | `rejectsRequiredMissingBlankForeignDuplicateAndOverlongAnswersWithoutPartialWrites`, `rejectsInvalidOptionalUrlsWhenLinkIsPresent`, `invalidHttpsUrlHttpErrorMatchesOpenApiExample` |
| SQL | `ApplicationRepository` uses `JdbcTemplate` bound parameters only | Code read |
| Transaction | All rows commit together; any failed write rolls back the application, answers, links and history | `commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory`, `historyFailureRollsBackApplicationAnswersAndLinks` |
| Concurrency | Lock order applicant → profile → club → round (`FOR SHARE`) → questions → memberships; round close/cancel/publish take `FOR UPDATE`; time is read after the round lock | `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock`, `waitingHttpRequestRechecksClosingTimeAfterRoundLock`, `severalEligibleStudentsHaveOverlappingHttpTransactions` |
| Duplicates | Service check plus unique `(round_id, applicant_id)`; only that constraint (name + SQLSTATE 23505) becomes 409 | `sameStudentConcurrentHttpSubmissionsCommitExactlyOnce`, `databaseUniqueConstraintIsFinalDuplicateSafeguardAndClassifierIsSpecific`, `ApplicationRepositoryExceptionTest` |
| Lock waits | 2 s transaction-local `lock_timeout`; a timeout or deadlock rolls back and returns 503, and the pool recovers | `realHttpLockTimeoutReturns503AndPoolAcceptsRetry`, `realHttpDeadlockVictimReturns503AndPoolAcceptsRetry` |
| Error output | Problem JSON with `traceId` and `no-store`; no SQL or stack text in the body; 5xx logged server-side | `assertProblem` in `ApplicationSubmissionHttpIntegrationTest`; the deadlock test checks the body |

## Findings and fixes

| Finding | Severity | Fix |
|---|---|---|
| No production `lock_timeout`, so the 503 path could not occur | P2 | `1053c14` |
| Duplicate detection matched English error text | P3 | `1053c14`: constraint name from `PSQLException` |
| Field code differed from OpenAPI; suspended account lost to a malformed body | P3 | `1053c14`; the account check moved to `ActiveAccountFilter` in `cfd2167` |
| Contract docs named classes, SQLSTATEs and `lock_timeout` | Docs | `2171d6b` |
| Every submission locked its round `FOR UPDATE`, so applicants to one round waited for each other | Performance | `23c8353`: `FOR SHARE`, club before round |

No open security or data-integrity findings.

## Still open

- PR #55 was merged with review comments only, no GitHub approval.
- Card owner sign-off: ______________________ Date: __________
