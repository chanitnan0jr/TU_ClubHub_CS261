# Task43-BE-2 / BE-3 — Transactional application service

## Scope and decisions

Implements the service/persistence layer of [API_v1.md §11](../api/API_v1.md#11-application-submission) and [openapi.yaml](../api/openapi.yaml). No application Controller, frontend, security configuration, or migration is added. This document is an implementation/test handoff, not PO/QA approval.

The requester confirmed on 2026-10-20 that the existing documents govern two conflicts in the task wording:

- Persist and return **`SUBMITTED`**, displayed as **Pending**. `PENDING` is not an allowed value in the current database checks or OpenAPI response.
- The limit is **five effective memberships in distinct clubs**, across club types. Effective means `status = 'ACTIVE'`, `joined_at <= now`, and `ended_at IS NULL`. Pending applications do not consume that limit. There is no per-round seat capacity or pending-application quota, and therefore no null/zero capacity semantics to invent.

Two different eligible students may both apply to the same round. A test asserting only one succeeds for a nonexistent final seat would contradict the confirmed contract. The concurrency tests instead prove one submission per student/round, independent applicants succeeding, fresh membership checks after a concurrent commit, and deadline/manual-close checks after waiting for a real round lock.

The current schema has no application/round soft-delete column. Applications in every existing status, including WITHDRAWN, count as prior submissions and prevent reapplication. No application row is deleted or modified by this service on retry.

## Files and entry point

Entry point: `ApplicationService.submit(String roundId, ApplicationSubmissionRequest request)` invoked on the injected Spring bean.

| Component | Responsibility |
|---|---|
| `application/service/ApplicationService` | Authentication/eligibility, transaction, round state, question and membership checks, atomic persistence |
| `application/repository/ApplicationRepository` | PostgreSQL row locks, reads/inserts, narrowly identifying the existing duplicate constraint |
| `application/service/ApplicationSubmissionValidator` | Decimal IDs, Unicode text, uniqueness of answer IDs, HTTPS URI validation, immutable normalized values |
| `application/domain/ValidatedApplicationSubmission` | Normalized internal write values, including original Unicode answer length |
| `application/dto/ApplicationSubmissionRequest`, `ApplicationAnswerInput`, `ApplicationLinkInput`, `ApplicationRequestJson` | Contract fields with strict JSON object/string/array types and rejection of unknown nested fields, independent of global mapper permissiveness |
| `application/dto/ApplicationSubmission` | Receipt containing only id, clubId, roundId, status, submittedAt |
| `application/service/ApplicationSubmissionException` | Service failure metadata: HTTP status, contract code, optional conflict reason, shared `ProblemResponse.FieldError` values |

JSON input does not allow applicant ID, status, scores, timestamps, body round/club IDs, question options or client-controlled link ordering. Only TEXT questions exist. Empty optional attachments are represented by `links: []`; a supplied null/blank link URL is invalid. URI validation parses the URI, requires HTTPS and a host, rejects whitespace/control characters and userinfo, and never fetches the URL.

## Transaction and locking

The public Service method uses `@Transactional(rollbackFor = Exception.class)`. Tests call the Spring proxy and prove rollback against PostgreSQL; there is no self-invocation transaction boundary or in-memory lock.

Lock/read order:

1. Resolve `ClubHubPrincipal.userId` from an authenticated, nonanonymous SecurityContext. Ignore the principal's role/name for eligibility and accept no caller-provided applicant ID.
2. Lock `users` with `FOR UPDATE`, then re-read current account status. Validate path/request syntax before student eligibility, matching the contract's shared-check ordering.
3. Lock `student_profiles` with `FOR UPDATE` and require verified ACTIVE status. Besides protecting the status, this prevents new membership foreign-key references from being inserted until the transaction ends.
4. Lock the target `recruitment_rounds` row with `FOR UPDATE`, the same row used by existing round close/publish and question management operations. Read-lock its club with `FOR SHARE` and require an ACTIVE club and a previously published round.
5. Read `Clock.instant()` **once, after obtaining the round lock**. Reject CANCELLED, not-yet-open and closed/manual-closed rounds with the documented precedence. Opening is inclusive and closing exclusive.
6. Read-lock questions with `FOR SHARE` and validate membership in the round, required answers and each question's input length. Existing trusted question writers also take the parent round lock.
7. Check prior applications without filtering by status. Lock all existing memberships for the applicant with `FOR SHARE` before counting effective distinct clubs; inactive/future/ended memberships do not count. The profile lock also protects against newly inserted memberships. Reject target membership first, then the five-club limit.
8. Insert application, answers, links and one initial history record. All locks last until the outer transaction completes. No membership or notification is created.

Future membership/confirmation writers should use a compatible applicant/profile locking order when adding multirow eligibility workflows. These locks do not introduce a reservation or quota for pending applications.

The Service returns a receipt, but the caller receives a successful return only after the Spring proxy commits (or after an outer transaction commits when the caller deliberately joins one). A future HTTP controller must send 201 only after the transactional boundary completes.

### Duplicate safeguard and rollback

The existing `uq_applications_round_applicant` unique constraint remains the final safeguard; no migration is needed. The application insert only translates `DuplicateKeyException` with SQLSTATE `23505` and that exact constraint name into `409 RESOURCE_CONFLICT / APPLICATION_ALREADY_EXISTS`. Other integrity failures propagate and trigger rollback rather than being called duplicates. No further database work occurs in the failed transaction after translating the duplicate.

Initial history is exactly `from_status = NULL`, `to_status = 'SUBMITTED'`, authenticated applicant as actor, `reason = NULL`, and the same server instant used by the application and links. If answers, links, or history fail, the whole transaction rolls back.

The follow-up QA checklist exposed a missing transient-lock error translation. The transactional public entry now maps only PostgreSQL SQLSTATE `55P03` (lock timeout/unavailable) and `40P01` (deadlock) to service metadata `503 SERVICE_UNAVAILABLE`, retains the cause for internal diagnosis, and triggers rollback. Other DataAccessExceptions still propagate. There is no automatic retry or new conflict reason. A real PostgreSQL reproduction failed before this fix and passed unchanged afterward; see the [45-case QA matrix](task43-qa-case-matrix.md).

## HTTP handoff still required

This task intentionally adds no endpoint handler. The existing OpenAPI operations remain pending as HTTP APIs. A future Controller/security integration must:

- Enforce the existing SESSION/CSRF policy and deserialize the dedicated request DTO.
- Map `ApplicationSubmissionException` metadata to the shared Problem format (including conflict `reason`), attach `traceId`/request `instance`, and use the contract's stable type suffixes.
- Invalidate the HTTP session for a suspended account; a service exception alone does not invalidate an HTTP session.
- Return 201, `Location: /api/v1/me/applications/{id}`, and `Cache-Control: no-store` after commit.
- Handle transaction-start/commit/database failures as 500/503 without disclosing SQL or credentials.

No Controller or broad exception advice was introduced simply to claim those HTTP behaviors are already implemented.

## Test coverage

`ApplicationSubmissionValidatorTest` now exercises 37 cases, including valid/invalid decimal IDs, Unicode whitespace/length before trimming, links count/label limits, URI parsing, null arrays/items/answer text, duplicate question IDs, wrong JSON scalar/array/object types, and forbidden fields even with a permissive mapper.

`ApplicationServiceIntegrationTest` uses real PostgreSQL, an injected mutable Clock, isolated committed fixtures with cleanup, and real transaction/proxy behavior. Its main methods are:

| Test method | Evidence |
|---|---|
| `commitsSubmittedReceiptAnswersLinksAndExactlyOneInitialHistory` | Current principal identity, receipt allowlist/types, normalized persisted content, timestamps, actor/previous status, one history, no membership/notification |
| `allowsNoCustomQuestionsAndNoDocumentLinks` | Empty arrays accepted when no custom required answers exist |
| `rejectsMissingAnonymousUnauthenticatedAndForeignPrincipal` | Invalid security contexts are rejected |
| `rejectsInactiveOrMissingStudentProfileEvenForAdmin` / `rechecksCurrentAccountStatusAndDoesNotTrustPrincipalRole` | Current DB eligibility, no Admin bypass |
| `hidesMissingRoundInactiveClubAndNeverPublishedRound` | Contract resource visibility |
| `openingIsInclusiveAndClosingIsExclusive` / `rejectsNotYetOpenManuallyClosedAndPreviouslyPublishedCancelledRounds` | Time/state boundaries and precedence |
| `rejectsRequiredMissingBlankForeignDuplicateAndOverlongAnswersWithoutPartialWrites` / `countsAnswerLengthBeforeTrimmingAndAllowsOptionalOmission` | Question validation against actual DB questions |
| `rejectsDuplicateIncludingWithdrawnApplicationsAndPreservesOriginalHistory` | One-per-round across statuses, no extra initial history |
| `rejectsExistingTargetMembershipBeforeMembershipLimit` / `rejectsFiveEffectiveMembershipsAcrossAllClubTypes` | Confirmed membership limit and conflict order |
| `ignoresInactiveEndedFutureMembershipsAndPendingApplicationsInLimit` | Exact membership counting and absence of invented pending quota |
| `invalidUrlProducesIndexedValidationErrorWithoutWriting` | HTTP URL rejected with indexed field error |
| `historyFailureRollsBackApplicationAnswersAndLinks` / `answerFailureMidwayRollsBackEarlierAnswersAndApplication` | Real DB check failures leave no committed submission, including an answer failure after the first answer was inserted |
| `databaseUniqueConstraintIsFinalDuplicateSafeguardAndClassifierIsSpecific` | Actual unique violation and narrow conflict classification |
| `concurrentSameApplicantProducesOneApplicationAndOneHistoryOnSeparateConnections` | Two simultaneous transactions, distinct `pg_backend_pid()` values, one success and one duplicate |
| `differentApplicantsMaySubmitConcurrentlyWithoutInventedSeatQuota` | Both eligible students may apply; memberships unchanged |
| `rechecksDeadlineOrManualCloseAfterWaitingForActualRoundLock` | A request demonstrably blocked on PostgreSQL observes new deadline/manual close after acquiring the lock |
| `rechecksMembershipLimitAfterConcurrentMembershipCommit` | Applicant blocked on a profile lock observes a fifth membership committed by another transaction |
| `priorApplicationInAnotherRoundDoesNotCountAsDuplicate` | Same applicant can apply to another round |
| `allPersistedApplicationStatesPreventSameRoundReapplication` / `applicationStateAloneDoesNotConsumeMembershipQuota` | Eight persisted states prevent duplicate applications but do not replace membership-based counting |
| `forbiddenApplicantAndStatusFieldsCannotCreateOrAssignApplications` | Applicant/user IDs and APPROVED status cannot be supplied by the client |
| `severalEligibleApplicantsCreateIndependentSubmissionsWithoutOrphans` | Five concurrent applicants use distinct connections and create independent complete submissions |
| `rollbackOfLockHolderLetsWaitingRequestCommitOneCompleteSubmission` | Waiting request succeeds after a fully written but uncommitted submission is rolled back |
| `realPostgresLockTimeoutReturnsServiceUnavailableAndRetryCanSucceed` / `realPostgresDeadlockVictimReturnsServiceUnavailableAndRetryCanSucceed` | Actual 55P03/40P01 errors become safe 503 service failures; rollback and a subsequent retry are verified |

Concurrency tests coordinate with latches, bounded Future timeouts and `pg_blocking_pids()`; they do not use sleep as a correctness signal. Each worker owns a separate transaction/connection. Fault-injection constraints are scoped to test-owned identifiers/content and removed in `finally` blocks.

## Running the checks

Use a dedicated PostgreSQL test database following the existing repo setup. Provide `DB_PASSWORD` privately and set both URL overrides to the same test database if its host/port differs from the defaults:

```sh
export SEEDTEST_DATABASE_URL='jdbc:postgresql://localhost:5433/tu_clubhub_test'
export ROUNDS_TEST_DATABASE_URL="$SEEDTEST_DATABASE_URL"
# Set DB_PASSWORD in your local shell without committing or sharing it.
cd backend
./mvnw -Dtest=ApplicationSubmissionValidatorTest,ApplicationServiceIntegrationTest test
./mvnw clean verify
git diff --check
```

The service changes require no frontend build or contract edits. There is no separate Backend lint goal configured in the current pom; Maven verify is the repo's Backend build/check command.

## Actual validation results — 2026-10-20

Used Java 21 and a fresh isolated PostgreSQL 18 container with the repository's existing test profiles. The user's existing database container was not modified. Credentials were supplied through a private temporary runner, not committed or printed.

| Check | Actual result |
|---|---|
| Baseline `./mvnw clean verify` before implementation | BUILD SUCCESS; 251 tests, 0 failures, 0 errors, 0 skipped |
| Initial Task43 focused tests before the follow-up QA table | BUILD SUCCESS; 60 tests: 30 validator/DTO + 30 PostgreSQL service integration, 0 failures/errors/skipped |
| Initial implementation `./mvnw clean verify` | BUILD SUCCESS; 311 tests, 0 failures, 0 errors, 0 skipped |
| New lock-timeout/deadlock reproductions before error-mapping fix | 2 tests, 2 failures, 0 errors/skipped; Spring SQL exceptions were not yet translated |
| Same two lock-timeout/deadlock tests after fix | 2 passed with unchanged assertions, 0 failures/errors/skipped |
| Latest focused Task43 tests after the QA table | BUILD SUCCESS; 89 tests: 37 validator/DTO + 52 PostgreSQL service integration, 0 failures/errors/skipped |
| Latest `./mvnw clean verify` | BUILD SUCCESS; 340 tests, 0 failures, 0 errors, 0 skipped; JAR and JaCoCo report generated |
| `git diff --check` and whitespace check of untracked additions | Passed |

No GitHub Actions run, HTTP application endpoint behavior, or PO/QA review is claimed by these local results. The [QA matrix](task43-qa-case-matrix.md) distinguishes 41 passing DTO/Service/database cases, one partially covered expired-session HTTP case, and three cases not applicable to the confirmed contract. The nonexistent per-round-seat quota tests were replaced by contract-consistent concurrency cases, not disabled or counted as skipped tests.

Suggested commit subject (under the repo's 50-character limit):

```text
feat(api): add atomic application submission
```

The initially requested `feat(api): add transactional application submission` is 51 characters; the shorter subject preserves its meaning and follows COMMIT_RULES.md. No commit or push was performed during this work.
