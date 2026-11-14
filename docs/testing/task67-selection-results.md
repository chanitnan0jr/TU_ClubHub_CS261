# Task67 — Selection decisions and result publication

**Local implementation/test handoff, 2026-11-13.** Branch:
`feat/task67-result-publishing`, based on `origin/main` at `e35f827`.
Results below record local verification before publication. Check the GitHub PR
for the current CI/review state; local results do not establish merge or approval.
Owner: อริยะวีร์ (BE2); requested reviewer: สิรวิชญ์ (SE).

## Scope and decisions

The requester resolved the two product mismatches before implementation:

1. Follow the existing docs/database: **ACCEPTED / REJECTED only**. WAITLIST / ตัวสำรอง
   remains unsupported and is rejected with 400. No new status is introduced.
2. Batch evaluation is **atomic**; validation/version/authorization/write/audit
   failure rolls back the whole batch, never partial success.

Sources: [Task67](../tasks/sprint2/Task67.md), [permission matrix §§2–4, 7](../security/permission-matrix.md),
[Task75 §2.6 and §4.3](../architecture/task75-sprint2-design.md), existing
`ApplicationDecisionRequest`, `CommitteeApplicationDetail`, `PublishResultsRequest`
and `PublishResultsResponse` in [OpenAPI](../api/openapi.yaml), and the actual V1
application/round/review/history/notification constraints. Current exact contract:
[API §15](../api/API_v1.md#15-selection-decisions-and-publication-task67).

## Files and flow

| File/group | Responsibility |
|---|---|
| `application/controller/SelectionResultController.java` | Dedicated editor GET, individual PUT, batch PUT and publication POST; no-store responses |
| `application/controller/ApplicationExceptionHandler.java` | Reuse the existing safe Problem/fieldErrors/root-reason handling for the new controller |
| `application/service/SelectionResultService.java` | Transaction entry points; scope/current grants/self-review, versions, round/window/state checks; atomic decisions and publication |
| `application/repository/SelectionResultRepository.java` | PostgreSQL row locks, explicit editor projections, parameterized writes, reviews/history, durable audit and notification inserts |
| `application/dto/ApplicationDecisionRequest.java` | Strict decision JSON/length/type/system-owned-field validation |
| `application/dto/BatchApplicationDecisionRequest.java` | 1–100 unique canonical string IDs and strict item validation |
| `application/dto/PublishResultsRequest.java` | Strict expected round version |
| `application/dto/CommitteeApplicationDetail.java` | Existing editor/write schema; separate from Task65's trimmed read DTO |
| `application/dto/PublishResultsResponse.java` | Round publication metadata and accepted/rejected counts |
| `committee/security/ClubSecurity.java` | Extend the existing guard: lock current grants before resource locks, retain IDs, recheck only those grants at the final write instant |
| `committee/domain/ClubCommitteeAssignment.java` | Read-only ID/role accessors needed by the retained-grant check |
| `db/migration/V6__selection_result_audit.sql` | New durable audit table/indexes; applied V1–V5 are unchanged |
| `SelectionResultRequestTest`, `SelectionResultHttpIntegrationTest` | Strict DTO tests; real filters/service/repository/PostgreSQL HTTP, privacy, rollback and concurrency |
| `docs/api/openapi.yaml`, `API_v1.md` | Same specification/version, implemented operations, batch schemas, examples and error contract |
| `README.md`, Task67 card, permission matrix, Task75 supplement | Implementation status/dependencies and audit supplement; formal review remains pending |

Java paths above are relative to `backend/src/main/java/com/tu/clubhub/`; migration
is under `backend/src/main/resources/`; tests are under
`backend/src/test/java/com/tu/clubhub/application/`. Existing applicant read mapping,
Task65 read DTOs, Spring Security configuration, frontend and applied migrations
were not changed.

### Endpoints

| Endpoint | Access | Success |
|---|---|---|
| `GET /api/v1/rounds/{roundId}/applications/{applicationId}/decision` | Effective COMMITTEE/PRESIDENT, no self-review, PUBLISHED non-CANCELLED round | 200 existing editor detail incl. version/draft/reviews |
| `PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` | Same grants; actual recruitment close reached; unpublished results | 200 updated editor detail |
| `PUT /api/v1/rounds/{roundId}/application-decisions` | Same grants/state; all items valid in this round | 200 `{items:[...]}` in input order |
| `POST /api/v1/rounds/{roundId}/publish-results` | Effective PRESIDENT only; all non-WITHDRAWN rows decided; before deadline | 200 round ID, club ID, actual publication time, deadline, outcome counts, new round version |

SESSION is required; writes keep CSRF. Admin without the proper assignment has no
shortcut. Any application by the actor in the round, including WITHDRAWN, blocks
review/decisions/publication. Account/student/club/effective membership and assignment
must meet the existing matrix. Existing unauthorized resources are 403; genuinely
missing ones are 404, after relevant parent authorization.

The editor GET is a new necessary Task67 contract: Task65 deliberately omitted
version/internal reviews, so its GET cannot initialize an optimistic decision
editor. This separate operation preserves Task65 and is explicit in OpenAPI/§15.
It does not implement optional `/start-review` or the selection UI.

### Draft protection

The only implemented applicant result reads are `/me/applications` list/detail.
They already use explicit DTOs and repeatable-read snapshots. New tests exercise
them after real decisions and before/after publication:

- Before publication: `applicantVisibleStatus=SUBMITTED`, resultMessage hidden,
  canConfirm/canDecline false, publication/deadline metadata hidden, no decision
  events/actors/private reasons/versions/reviews/notes in timeline or nested objects.
- Lists count owned applications without filtering on private decision outcomes.
- After publication: only the owner's result/feedback is visible; foreign details
  remain 403 and internal notes/evaluators remain absent. Tests assert nested field
  allowlists. Task65's trimmed read contract remains unchanged.
- Notifications are inserted only with committed publication, with generic text
  and a stable unique round/application deduplication key. No applicant notification
  read endpoint or external notification worker is added. Admin aggregate statistics
  remain a separately protected administrative channel.

### Locking, time and audit

Each write enters a real Spring transaction. Order:

1. Lock effective granting assignment rows SHARE, using the existing guard/query.
2. Decision: round SHARE then requested applications UPDATE in ascending ID order.
   Publication: round UPDATE then all applications UPDATE in ascending ID order.
3. Sample the final UTC Clock instant after those locks, at PostgreSQL microsecond
   precision. Recheck current eligibility/term and all-status self-review, then
   state, deadline and expected version. Grant acquisition may sample an earlier
   time; actual business/history/audit/notification timestamps share the final time.
   No new assignment lock is acquired after the round lock.
4. Commit business writes, changed-state history, review, durable audit and any
   publication notification rows together; retain locks through commit/rollback.

Decision permits SUBMITTED/UNDER_REVIEW/ACCEPTED/REJECTED before publication.
`now >= COALESCE(closed_at,closes_at)` includes actual close. Same-status edits
increment version/audit but add no duplicate history. Nonblank internalNote upserts
only the caller's review; absent/null/blank preserves an existing comment while syncing its recommendation. Absent/null resultMessage
clears it. All non-WITHDRAWN applications must be ACCEPTED/REJECTED before publication,
which requires `now < confirmation_deadline`; repeated publication is 409 with no
additional audit/history/notification. Publication does not change application rows.

V6 adds durable selection audit because the older Task75 logger-only design cannot
roll back with business data. Follow Task78's actor/action/resource/time/server-UUID
conventions. Decision rows record old/new status/version and message/note change
flags; batch rows share a trace UUID. Publication records old/new round version,
published flag and counts. Raw notes/answers/document URLs/session identifiers are
excluded. Structured SLF4J events run only after commit; they are supplementary.
The existing bounded per-lock configuration (submission lock-timeout, default 2s)
is reused. Only PostgreSQL 55P03/40P01 is translated to 503; other injected write
failures remain safe 500 responses, not fake duplicates/conflicts.
Assignment revocation is serialized by retained assignment locks. As with the
existing guard, account/student/membership/club changes are read as committed at
the final eligibility check; this is not a global lock on that entire hierarchy.

## Acceptance criteria → automated tests

All methods below are in `SelectionResultHttpIntegrationTest` unless noted.

| Criterion | Method(s) |
|---|---|
| Both decisions, notes, actor/time, changed-state history, audit and same-state edits | `decisionsUsePrincipalHistoryAndDurableAuditAndSameStateEditsDoNotDuplicateHistory` |
| Atomic batch, response order, shared trace, stale/foreign/missing/duplicate item refusal | `atomicBatchPreservesOrderValidatesEveryItemAndUsesOneTrace` |
| Draft status/feedback/metadata/timeline masking; published own-only result, private notes never exposed; no duplicate side effects | `draftIsHiddenInApplicantListDetailTimelineMetadataAndPublicationRevealsOnlyOwnResult` |
| Session/CSRF on writes, own-club scope, ordinary/foreign/Admin denial, no self-review | `authorizationCsrfAndResourceScopeAreEnforcedBeforeChildProbing` |
| Expired/revoked grants, inactive membership/student/club, suspended account | `ineffectivePermissionsRejectWrites` (6 parameter invocations) |
| Invalid IDs/outcomes/lengths/overposting, stale version, WITHDRAWN/DRAFT/CANCELLED rules, no partial mutation | `validatesStatesVersionsIdsNotesAndDoesNotCreatePartialData` |
| Actual close inclusive, manual close, still-open/incomplete/deadline/stale publication rejection | `closeBoundariesManualCloseAndPublicationPreconditionsFollowContract` |
| Batch history/audit failure after real application/review/history writes; rollback and retry | `failedDecisionHistoryOrAuditRollsBackTheWholeBatchAfterRealDatabaseWrites` (2) |
| Failed notification/audit after real round + notification writes; rollback preserves decisions/old data and retry works | `publicationFailureRollsBackMetadataNotificationsAndAuditButPreservesDecisions` (2) |
| Decision holds round SHARE while publication waits; publication uses the committed outcome | `evaluationAndPublicationOverlapOnDifferentConnectionsAndPublishTheCommittedDecision` |
| Concurrent publications commit once; late evaluation gets RESULTS_ALREADY_PUBLISHED | `simultaneousPublicationCommitsExactlyOnceAndPreventsLateEvaluation` |
| Term expires while waiting → 403, no writes | `termExpiryWhileWaitingForRoundLockIsRecheckedBeforeWriting` |
| Deadline reached while waiting → unpublished, no notification or exposed result | `publicationDeadlineIsSampledAfterWaitingAndExpiredRoundStaysPrivate` |
| Competing decisions at the same version → one success, one VERSION_MISMATCH, one audit/transition | `simultaneousDecisionsWithSameVersionCommitOneAuditAndOneTransition` |
| UNDER_REVIEW source, WITHDRAWN exclusion, zero-app round, president self-review, missing round/null body | `underReviewAndWithdrawnRulesEmptyRoundsAndPublicationSelfReviewAreExplicit` |
| Real stored SESSION cookie traverses filters and APIs; anonymous editor refused | `realStoredSessionCanEvaluateAndPublishButAnonymousEditorIsProtected` |
| Exact lock SQLSTATE mapping/rollback, without masking arbitrary failures | `onlyKnownPostgresLockFailuresBecome503AndRollbackAllDecisionWrites` (2; test-injected SQLSTATEs, not a claim of creating an actual deadlock) |
| Strict JSON types/required/unknown system fields, WAITLIST, UTF-8/length/NUL, unique bounded canonical batch IDs, publication version | `SelectionResultRequestTest` (21 invocations across 5 methods) |

### Evidence for concurrency and rollback

Fixtures are inserted/committed before worker HTTP requests, with no outer test
transaction. Every worker traverses real MockMvc security filters, ClubSecurity,
Service and Repository using its own transaction/connection. The test pool is 8;
maximum workers are 3 plus coordinator/observer, leaving capacity. Fixed/mutable
Clock controls time; no sleep waits for business boundaries.

A coordinator holds a PostgreSQL advisory transaction lock. A **test-only AFTER
UPDATE trigger** pauses the chosen real application/round write while it holds
resource locks. Another HTTP request starts and is observed in `pg_stat_activity`
with `pg_blocking_pids`. Tests require distinct backend PIDs and unfinished futures
before releasing the coordinator. PostgreSQL may queue later waiters behind earlier
waiters; the test checks the actual lock queue rather than requiring all blockers
to point directly to the first holder. The coordinator then commits, every worker
result/exception is collected with timeouts, and fresh database reads assert
business/audit/history/notification state. Logs print `Task67 PostgreSQL overlap`
with blocker/blocked PIDs. Time-wait tests similarly hold the real round lock,
advance Clock only after observing the wait, then release it.

Rollback uses fixture-scoped test-only BEFORE INSERT triggers. They verify that
real application/status-history/review or round/notification writes are already
visible inside the failing transaction, then advance a **test proof sequence** and
raise SQLSTATE P6701. For the batch, failure is on the second item after the first
item's real writes; publication failure follows at least one real notification.
The sequence proves the intended stage was reached despite transaction rollback;
it is not an assertion about business sequence continuity. A new autocommit read
compares business/audit/history/review/notification rows to the complete before
snapshot (including unrelated fixtures), then retries successfully. All triggers,
functions, proof sequences, fixture rows and stored sessions are cleaned up. Each
test asserts zero active pooled connections after cleanup.

## Checks and actual local results

Environment: Temurin JDK 21, PostgreSQL **18** (same major as Backend CI), dedicated
`clubhub-task67-db` on a dynamically allocated loopback-only port. No shared/demo
DB or `.env` was used/changed. New V6 was also tested on a recreated disposable
schema; applied V1–V5 were not edited. Private temporary database credentials were
not printed. Full Maven logs are local `/private/tmp/clubhub-task67-*.log` artifacts.
The disposable container and private credential files were removed after the
successful checks; the existing shared/demo Docker containers were preserved.

| Check | Actual result |
|---|---|
| Baseline `./mvnw clean verify` before Task67 edits | **791 passed, 0 failures/errors/skipped** |
| Focused `./mvnw test -Dtest=SelectionResultRequestTest,SelectionResultHttpIntegrationTest` | **46 passed** (21 request + 25 PostgreSQL HTTP invocations) |
| Final `./mvnw clean verify` | **837 passed, 0 failures/errors/skipped; BUILD SUCCESS**, including packaged backend and JaCoCo report |
| Five concurrency/time-wait methods, 3 consecutive focused runs | **15/15 passed**; additional development/full-suite runs also exercised them |
| Redocly CLI 1.34.5, both existing specs | **Valid, 0 errors, 8 pre-existing warnings**; unchanged HEAD specs also emit exactly 8 warnings |
| Supplementary local YAML/JSON Schema checks | Unique YAML keys, refs/examples, 4 operation security/ID contracts, 7 OpenAPI + 4 Markdown examples, applicant nested field allowlists, original unrelated contracts unchanged: **passed** |
| `git diff --check` | **Passed** |
| GitHub Actions / PO or reviewer review | **Not run/not obtained at the time of local verification; consult the PR for current status** |
| Frontend tests/browser checks | **Not run: no frontend changes or new UI in Task67** |

An early new-code compile failure (missing assignment accessors) was fixed before
the passing runs. An early concurrency test assumed that PostgreSQL's third waiter
blocked directly on the holder; the actual queue could block it on the earlier
waiter. The corrected test still proves real overlapping database waits and keeps
all business assertions. No existing baseline test failed; no test was skipped or
assertion weakened to change an expected business result.

### Re-run using the repository setup

From `backend`, configure a **disposable PostgreSQL 18** test database using the
existing setup (do not point at production). Set DB_PASSWORD privately and set
both SEEDTEST_DATABASE_URL and ROUNDS_TEST_DATABASE_URL to its JDBC URL when the
local port differs from 5432. Then:

```sh
./mvnw test -Dtest=SelectionResultRequestTest,SelectionResultHttpIntegrationTest
./mvnw test '-Dtest=SelectionResultHttpIntegrationTest#*Overlap*+simultaneous*+*Waiting*+*SampledAfterWaiting*'
./mvnw clean verify
```

Run the middle command three times for the repeat check. From repository root:

```sh
npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml
git diff --check
```

No PostgreSQL check remains blocked locally. GitHub Actions still needs to execute
on the eventual commit/PR; local results do not claim that remote result.

## Reviewer walkthrough

Use the integration fixture (all identities/data fictional), or prepare equivalent
committed data: one ACTIVE club, effective COMMITTEE and PRESIDENT memberships,
two other ACTIVE student applicants, PUBLISHED round at actual close with a future
confirmation deadline, SUBMITTED applications, and the existing initial history.
A foreign club/committee and an ordinary applicant exercise negative authorization.

1. Run the focused suite above to reproduce the prepared fixtures and assertions.
2. As committee, GET the dedicated `/decision` editor; record application version.
   PUT one ACCEPTED with resultMessage plus an unmistakable private internalNote;
   decide the other REJECTED individually or via batch, using each current version.
3. As applicant, call `/me/applications` and own detail before publication. Confirm
   SUBMITTED, no message/publication/deadline, no internal notes/actors/history.
4. Try publication as ordinary committee/foreign president: 403. Try a stale batch:
   409 and no changed rows/audit. An undecided round cannot publish.
5. As the effective president, POST `/publish-results` with current round version.
   Confirm the timestamp/counts/new version; inspect one generic notification per
   decided application and one publication audit, with unchanged application rows.
6. Read each applicant's own detail: only their result/feedback appears; foreign
   applicant detail remains 403, private notes/reviews/evaluator identities absent.
7. Repeat publish and attempt decision edit: 409 RESULTS_ALREADY_PUBLISHED and no
   duplicate audit/history/notifications. Inspect durable before/after audit states
   and shared batch trace, with no private text persisted in audit snapshots.
8. Run the failure/concurrency methods in the table to verify rollback, actual lock
   overlap, final-time checks and successful recovery rather than relying on UI.

### Remaining review/deployment items

- PO/reviewer should confirm the new editor GET and batch route/100-item technical
  bound, the documented null/blank note semantics and zero-active-application
  publication interpretation. Only two outcomes and atomic batch were explicitly
  requester-confirmed; neither adds a new recruitment quota.
- Review V6 audit access/retention policy and notification delivery as separate
  deployment/product work. Selection UI, WAITLIST, optional start-review,
  confirm/decline and automatic expiry are not implemented here.
- Review/CI/deployment still need to happen. Focused commit subject
  (46 characters): `feat(api): add evaluation and result publishing`.

## Local worktree consolidation requested alongside Task67

Fetched/fast-forwarded the canonical repository to current `origin/main` before
creating this branch. Both local and remote Task52/65/78 heads were verified as
ancestors of main. Removed the two clean merged Task65/78 worktrees and only the
three merged local branches. Their generated reports were retained in
`/private/tmp/clubhub-worktree-cleanup-2026-11-13`. Remote branches were not deleted.
The canonical ignored `.env` was preserved. The **unmerged** issue78 worktree and
`fix/auth-login-success` branch/PR85 were preserved; they were not folded into main.
