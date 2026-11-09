# QA — Task52 club application submission

> **Latest verdict after authorized fix (2026-11-09): QA52-001 resolved.**
> Final backend verification: **608 passed**, 0 failures/errors/skipped.
> See [the fix and verification follow-up](#authorized-qa52-001-fix--2026-11-09).
> Earlier failures below are retained as before-fix evidence.

Date: **2026-11-09**. Branch `feat/club-application-submission`; worktree
`TU_ClubHub_CS261`. Base and fetched `origin/main`: `e2712a9e8e7f44b57b80f3031d9475985ba9aa83`.
`git fetch origin` succeeded. Branch has no upstream and has uncommitted implementation;
no pull/checkout/merge/reset was used. No applicable AGENTS.md found; COMMIT_RULES.md,
Task42/52/75, API_v1 §11/11.1/12, schemas, actual JDBC flow and existing tests were read.
The original QA pass changed **tests and this report only**, preserving all production/API files. The requester subsequently authorized fixing QA52-001; see the dated follow-up below.

## Original QA verdict (before the authorized fix below)

**Not fully green / fix or resolve QA52-001 before claiming verification passes.**
Core authentication, scope, TEXT/HTTPS validation, duplicate prevention, post-write
rollback and concurrent HTTP cases pass. The new timestamp consistency regression
fails in both focused and full runs. It is a low-impact inherited shared-flow issue,
not a newly introduced club-route security defect. No production fix was made.

## Case matrix

All method names are in `ApplicationSubmissionHttpIntegrationTest` unless prefixed.
PASS means executed in this QA run, not inferred from the previous implementation report.

| Case | Test method(s) | Result | Evidence |
|---|---|---|---|
| APP-01 | `clubSubmissionSelectsRequestedRoundAtOpeningWhenSeveralRoundsAreOpen`, `assertComplete`; new `clubReceiptAndInitialHistoryMatchPersistedTimeWithNanosecondClock` | **FAIL (precision edge); main success PASS** | 201/SUBMITTED, correct session applicant, round/club, answers, link order, one NULL→SUBMITTED actor/history checked; nanosecond receipt differs from stored time (QA52-001) |
| APP-02 | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity`, `expiredAndSuspendedSessionsCannotSubmitAndAreInvalidated` | PASS | Real session/CSRF filters, anonymous/expired 401, no new rows |
| APP-03 | `httpBoundaryUsesSessionsCsrfAndRejectsClientIdentity`, `clubSubmissionValidatesItsEnvelopeWithoutCoercion`, validator `clubRequestSelectsRoundAndReusesStrictNestedContentParsing` | PASS | Forged applicant/status/attachment fields rejected 400 at strict JSON boundary; no writes |
| APP-04 | `clubSubmissionChecksRoundOwnershipVisibilityAndWindow` (10 scenarios) | PASS | Missing/inactive/wrong/draft hidden with 404; future/closed/manual-close/cancelled rejected with contract reason |
| APP-05 | `clubSubmissionChecksRoundOwnershipVisibilityAndWindow`, `clubSubmissionSelectsRequestedRoundAtOpeningWhenSeveralRoundsAreOpen`, `sameStudentCanSubmitToDifferentRoundsConcurrently` | PASS | Required roundId controls selection with multiple open rounds; wrong club rejected, no auto first/latest |
| APP-06 | new `clubHttpOpeningInclusiveClosingExclusiveMatchesStoredHistory` (5); new `clubSubmissionRechecksAfterFormWasLoadedBeforeClosing`; `waitingHttpRequestRechecksClosingTimeAfterRoundLock` | PASS | Before/open/before-close/exact-close/after-close, fixed Clock; form loaded before close is not a reservation; time rechecked after actual lock wait |
| APP-07 | `bothSubmissionRoutesShareDuplicateIdentityAndPreserveExistingRows`, `sameStudentCanSubmitToDifferentRoundsConcurrently`, new `withdrawnApplicationStillPreventsClubHttpResubmissionWithoutChangingRows`; service `allPersistedApplicationStatesPreventSameRoundReapplication` | PASS | Duplicate in either route is 409; other round allowed; WITHDRAWN does not permit resubmission; row snapshots unchanged |
| APP-08 | extended `clubSubmissionValidatesCurrentQuestionSetBeforeWriting`, new `clubSubmissionOmitsOptionalAnswersAndUrlsWithoutChangingApplicantProfile`; validator `rejectsNullEmptyOrWhitespaceAnswerText` | PASS | Required missing/null/empty/whitespace rejected; optional answer omission and links=[] accepted; user/profile snapshots unchanged |
| APP-09 | extended `clubSubmissionValidatesCurrentQuestionSetBeforeWriting`, validator strict parsing methods | PASS | Unknown/foreign/duplicate IDs, per-question overlength, false/0 invalid for TEXT type; no unexpected 500 or partial rows |
| APP-10 | validator `rejectsInvalidOptionalUrlsWhenLinkIsPresent`, `trimsTextPreservesUrlsAndCountsUnicodeBeforeTrimming`; `invalidHttpsUrlHttpErrorMatchesOpenApiExample`, new optional omission test | PASS | Allowed HTTPS (case insensitive), host/userinfo/scheme/whitespace/prefix errors, indexed field code; no fetching URLs |
| APP-11 | `assertComplete`, new optional omission test, strict nested DTO tests | PASS for actual URL-only flow | application_links label/URL/order tied to correct application; forged attachment IDs rejected. Uploaded-reference ownership/download/signed-URL tests NOT RUN because no such model/endpoint exists in this scope |
| APP-12 | `injectedWriteFailureRollsBackAndSameStudentCanRetry`, `failedHttpLockHolderRollsBackAndWaitingRetrySucceeds` | PASS | Test-only real PG trigger checks prior writes before raising; all new rows rollback; existing unrelated rows unchanged; retry and waiting request succeed |
| APP-13 | `sameStudentConcurrentHttpSubmissionsCommitExactlyOnce`, `sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce`, `clubAndRoundRoutesSubmittingConcurrentlyCommitExactlyOnce` | PASS | Real HTTP/security/service/PG, distinct backend PIDs/txids, blocking proof, exactly one application/answer set/link/initial history |

The current model supports TEXT questions, required arrays (empty when allowed),
HTTPS URL links and no seat quota. False/0 are rejected as wrong JSON types for TEXT,
not incorrectly treated as missing numeric/boolean answers. No option/upload/quota
requirement was added. Membership limit remains the confirmed five effective clubs.

## Bug list

### QA52-001 — Low — Receipt time differs from persisted application/history time

- **Repro:** valid club HTTP submission, fixed `Clock` instant
  `2026-10-21T09:30:00.123456789Z`, open PUBLISHED round and valid two TEXT answers/link.
- **Expected:** committed receipt describes the same server submission instant as
  `applications.submitted_at` and initial `application_status_history.changed_at`,
  consistent with §11's database mapping and existing success assertions.
- **Actual:** 201, response `submittedAt=2026-10-21T09:30:00.123456789Z`;
  both stored values `2026-10-21T09:30:00.123457Z`. Difference is 211ns. All rows
  commit correctly; no duplicate, missing history or privilege failure is observed.
- **Evidence:** new regression fails with two equality failures in focused and full
  Surefire reports. Full: 593 run, 1 failure, 0 errors/skipped. PostgreSQL is reachable;
  this is not a migration or CI environment failure.
- **Root cause:** `ApplicationService.submitInCurrentTransaction` samples raw
  `clock.instant()` and returns that value; JDBC persistence rounds the timestamp.
  `ApplicationRepository.insertApplication` / `insertInitialHistory` do not return
  the stored timestamp. The same raw sample exists in baseline HEAD (line 108), so
  this issue predates the added Task52 route.
- **Proposed change, NOT applied:** select one supported timestamp precision once
  after locks and use it consistently for availability checks, writes and receipt,
  or return/propagate the actual stored timestamp. Retain the regression and all
  time-boundary assertions. Do not change the expected values merely to green the test.

## Requirement gaps / limits (separate from defects)

- API specifies ISO UTC timestamps but not a wire fractional-digit cap. Team should
  record the canonical precision with the fix; the observed inconsistent values
  are proven, while a particular rounding/truncation policy is not silently imposed.
- URL documents have no upload/reference ownership or download-access mechanism;
  those cases are outside the actual model, not passed by mocking a nonexistent service.
- GET at receipt Location is a future US-04 dependency expressly documented in the
  contract. This QA does not claim that applicant-tracking endpoint is implemented.
- No last-seat quota exists. No quota-concurrency acceptance criterion was invented.
- Formal PO/team review of the user-confirmed additional route remains pending.

## Added/extended tests

Only `backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionHttpIntegrationTest.java` changed:
6 additional question-validation scenarios, 5 HTTP boundary invocations, and one
case each for form→closed submission, optional omission/profile preservation,
withdrawn reapplication, and the timestamp consistency regression: **15 added invocations**.
Existing assertions were retained. The new failing regression is enabled.

## Commands and actual results

Java21 and dedicated PostgreSQL18 database `qa_task52`, separate from demo containers.
Private credentials provided only through a temporary protected environment file.

| Command/check | Tests | Passed | Failures | Errors | Skipped / not run |
|---|---:|---:|---:|---:|---|
| `./mvnw -Dtest=ApplicationSubmissionValidatorTest,ApplicationServiceIntegrationTest,ApplicationSubmissionHttpIntegrationTest test` | 179 | 178 | 1 (QA52-001) | 0 | 0 |
| Selected 15 concurrency/rollback invocations ×3 new QA repetitions | 45 | 45 | 0 | 0 | 0 |
| `./mvnw clean verify` | 593 | 592 | 1 (QA52-001) | 0 | 0; BUILD FAILURE, packaging did not complete |
| Redocly on both specs with repository config | — | valid | 0 lint errors | — | 9 existing warnings |
| OpenAPI spec validator / YAML / refs, both docs | — | valid | 0 | — | Python system LibreSSL warning only |
| `git diff --check`, production/contract SHA256 comparison | — | passed | 0 | — | no production/contract changes in QA |
| Frontend checks, remote GitHub Actions, combined branches | — | — | — | — | NOT RUN; no FE logic changed, no publication/merge |

Repeat selector:

```sh
./mvnw '-Dtest=ApplicationSubmissionHttpIntegrationTest#sameStudentConcurrentHttpSubmissionsCommitExactlyOnce+sameStudentFiveConcurrentRequestsUsingOneSessionCommitExactlyOnce+clubAndRoundRoutesSubmittingConcurrentlyCommitExactlyOnce+injectedWriteFailureRollsBackAndSameStudentCanRetry+waitingHttpRequestRechecksClosingTimeAfterRoundLock+failedHttpLockHolderRollsBackAndWaitingRetrySucceeds' test
```

This focused repeat does not include the new timestamp regression; full verify
**does include it and fails**. No skip flag, disabled test or reduced assertion is used.
All concurrent fixtures commit first, workers own separate transactions/connections,
bounded latches and pg_blocking_pids prove overlap, futures/exceptions are collected,
and test-only triggers/rows/sessions are cleaned after workers finish. No sleep or
outer test transaction substitutes for production rollback.

Evidence logs: `/private/tmp/clubhub-qa-task52-focused.log`,
`clubhub-qa-task52-repeat-{1,2,3}.log`, `clubhub-qa-task52-verify.log`,
`clubhub-qa-task52-openapi.log`; final XML under `backend/target/surefire-reports/`.

Task52 results were reported to the requester before proceeding to Task65/78.
No commit, push, PR or merge was performed.

## QA cleanup

After all task runs, direct PostgreSQL checks confirmed **0 own fixture users**,
**0 task failure functions**, and **0 other open worker transactions** in each
separate QA database. The disposable QA container and private credential/runner
files were removed; existing demo containers were untouched. Non-secret logs and
Surefire reports remain for review. Production/contract file sets and hashes were
compared again after all three tasks and remained unchanged.

## Authorized QA52-001 fix — 2026-11-09

The requester asked to fix Task52 before committing or opening PRs. The original
QA findings above are retained as **before-fix evidence**, not the current verdict.
No assertions were removed, skipped or relaxed.

### Root cause and change

A fresh run of the original single regression reproduced **1 failure, 0 errors,
0 skipped** before the fix (`clubhub-task52-fix-before.log`). The Java clock
returned nanoseconds, while PostgreSQL TIMESTAMPTZ stored a rounded microsecond
value. `ApplicationService` now samples the clock once after the round lock and
truncates that instant to microseconds. Both POST routes share that flow and use
the same value for checks, application timestamps, link creation, initial history
and the receipt. No repository query, lock ordering, transaction boundary,
identity/authorization rule, quota or application status was changed by this fix.

Truncation follows the PostgreSQL precision and the Task78 assignment service's
existing approach. It never rounds a just-before-close request into the next
microsecond. Database round boundaries already have microsecond precision, so
`opensAt <= now < closesAt` retains its inclusive/exclusive meaning. The Markdown
contract and shared OpenAPI `ApplicationSubmission.submittedAt` description now
state the precision explicitly; the response fields/status remain unchanged.

### Regression coverage

- `clubReceiptAndInitialHistoryMatchPersistedTimeWithNanosecondClock`: extended
  the original equality regression to **8 invocations**, both submission routes,
  clock fractions of 1ns, .123456123s, .123456789s and .999999789s. Verifies exact
  equality among receipt, application submitted/updated timestamps, initial history
  and link creation time, plus the explicit expected microsecond value.
- `nanosecondClockPreservesInclusiveOpeningAndExclusiveClosing`: **8 invocations**,
  both routes, 1ns before opening, exact opening, 1ns before closing and exact
  closing. Rejected requests leave no rows; successful ones have exact timestamps,
  two answers, one link and one initial history.
- The existing controlled Clock still asserts a **single sample** per submission
  inside the real service transaction; all original concurrent/rollback assertions
  remain enabled.

### Post-fix checks

Dedicated disposable PostgreSQL18 database and Java21, separate from demo containers.

| Check | Actual result |
|---|---|
| Original failure reproduced before fix | 1 run, 1 failure, 0 errors/skipped |
| Precision + boundary regression methods | **16 passed**, 0 failures/errors/skipped |
| Validator + service + HTTP submission suites | **194 passed** (39 + 53 + 102), 0 failures/errors/skipped |

| `./mvnw clean verify` (two complete post-fix runs) | **608 passed per run**, 0 failures/errors/skipped; JAR and JaCoCo generated |
| Same 15 selected concurrency/rollback invocations ×3 post-fix repetitions | **45 passed** total, 0 failures/errors/skipped |
| Redocly 1.34.5 on both specifications | Valid, 0 errors; 9 pre-existing warnings |
| Strict duplicate-key YAML, OpenAPI validator and references (both specifications) | Passed; precision descriptions consistent |
| `git diff --check` | Passed |

Post-fix logs: `/private/tmp/clubhub-task52-fix-before.log`,
`clubhub-task52-fix-regression.log`, `clubhub-task52-fix-focused.log`,
`clubhub-task52-fix-repeat-{1,2,3}.log`, `clubhub-task52-fix-verify.log`,
`clubhub-task52-fix-final-verify.log`, `clubhub-task52-fix-openapi-cached.log`.
Final complete XML reports remain under `backend/target/surefire-reports`.

The normal `npx --yes` lint launcher could not resolve its registry request in the
restricted environment; running the already-installed **same Redocly 1.34.5**
binary completed lint successfully. No lint rule was weakened. No frontend code
changed, so frontend checks were not rerun for this fix. Remote GitHub Actions,
combined-branch verification and reviewer approval remain unverified at this
point; local success does not assert those outcomes.

**Current conclusion:** QA52-001 is fixed with regression coverage. Task52 can be
submitted for review with its original route-selection and Location dependency
caveats. No known local verification failure remains.
