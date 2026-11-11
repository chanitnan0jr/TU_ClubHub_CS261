# QA — Task78 assignment concurrency

Date **2026-11-09**. Branch `fix/assignment-concurrency`; independent worktree
`TU_ClubHub_CS261-task78`, based on fetched origin/main `e2712a9`. The shared
repository fetch succeeded before QA; branch has no upstream and existing dirty
implementation, so no pull/checkout/merge/reset was performed. No applicable
AGENTS.md found. COMMIT_RULES.md, Task75/78 model, permission matrix §§2/5–7,
V1/V4, Admin contract, all mutation paths and existing tests were read.
Task52 and Task65 results were reported sequentially before beginning this review.

**QA changes: tests and this report only. Production code, migrations and contracts
are byte-for-byte unchanged from the start of this QA pass.**

## Verdict

**Ready for Task78 reviewer inspection on its own branch.** Current local
acceptance tests and complete verify pass. No new Task78 product defect was
proven. GitHub CI, deployment, formal review and a combined branch are not claimed.
Migration privilege/existing-data preflight remains a rollout requirement, not a
passing test on an undisclosed production database.

## Case matrix

Methods are in `AssignmentHttpIntegrationTest` unless qualified. All PASS entries
were executed in this QA run against real PostgreSQL.

| Case | Test method(s) | Result | Evidence |
|---|---|---|---|
| LOCK-01 | `adjacentTermsDistinctRolesAndOffsetTimestampsKeepExactHistory`, `staleVersionAndAlreadyRevokedAreDistinctAndDoNotWrite`, new `serverNanosecondClockUsesOneCanonicalMicrosecondInstantForGrantAndAudit` | PASS | Create/read/revoke/replace, retained old/new IDs, versions, actor/reason/audit, adjacent terms and distinct roles, canonical DB/response/audit instant |
| LOCK-02 | `twoAdminsReplacingOneVersionCannotLoseUpdates` | PASS | Two actual Admin HTTP transactions overlap; one 201, one 409 VERSION_MISMATCH; exact old REVOKED/version+1 and one new ACTIVE/version0; two correlated audit entries |
| LOCK-03 | `duplicateConcurrentAppointmentsCommitExactlyOneGrantAndAudit` | PASS | One overlapping grant and ASSIGNED audit only; loser receives 409 ASSIGNMENT_TERM_OVERLAP, not 500; actual effective permission checked |
| LOCK-04 | `replaceAndRevokeResolveByExpectedVersionWithoutResurrection` (both winning orders) | PASS | First lock holder determines serialized result; stale opposite operation conflicts; DB and effective permission match winner, no assumed permanent grant/revoke preference |
| LOCK-05 | `staleVersionAndAlreadyRevokedAreDistinctAndDoNotWrite`, concurrent replace/revoke cases | PASS | Stale version rejected before already-revoked state; GET refresh returns current version; no silent overwrite/retry/audit duplication |
| LOCK-06 | `auditFailureAfterRealReplacementWritesRollsBackAndRetrySucceeds` (first/second audit stage) | PASS | Test-only PG trigger proves old revoke/new insert and preceding audit write exist before exact 23514 failure; 500 safe Problem; old row restored and new/audit removed; unrelated row unchanged, retry succeeds |
| LOCK-07 | `failedHolderRollsBackBeforeWaitingAdminReplacesOriginalVersion`, `databaseLockTimeoutReturnsSafe503ThenPoolAndRetryWork` | PASS | PG coordinator→failed holder→waiting HTTP transaction chain; rollback releases locks and waiter succeeds using original version; real 55P03 gives safe 503; pool/retry works |
| LOCK-08 | new `independentRecipientsInTheSameClubCanFinishWhileAnotherAssignmentIsLocked`, new `independentPermissionRolesForOneRecipientSerializeWithoutFalseConflicts` | PASS | Different recipients in one club both replace successfully, second finishes while first still holds real locks; same recipient/different roles serializes and both create successfully without false overlap/version conflict |
| LOCK-09 | production/script scan, `AssignmentInvariantIntegrationTest.nativeOverlappingUnrevokedTermsAreRejected`, new `nativeTermUpdateCannotBypassTheOverlapConstraint`, `revokedHistoryDoesNotBlockReplacementAtTheSameStart` | PASS for API paths and DB term invariant | Product JDBC mutations run through locked service; revoke uses expected version and version+1; no product bulk/hard-delete endpoint. Native INSERT and UPDATE term overlaps hit named exclusion constraint; historical revoked rows do not block valid replacement. Privileged dev/seed SQL limits documented below |
| LOCK-10 | `revocationWaitsForExistingCommitteeWriterAndRemovesNextPermission`, new `grantingAndRevokingOneRoleDoesNotAffectOtherRolesOrClubs` | PASS | Real granting SHARE lock conflicts with Admin revoke; existing target SESSION sees new grant without login; one revoked role leaves other valid role usable; final revoke denies; foreign club remains denied |

Additional executed protection tests cover current DB Admin role vs old session
claims, self create/replace/revoke prohibition, anonymous/CSRF guards, inactive
recipient/membership/club and allowed inactive-target revocation, strict DTO/system
field rejection, datetime/year/precision/length bounds and safe missing/cross-scope IDs.

## Added tests

Two existing files extended; **5 invocations added**:

1. `backend/src/test/java/com/tu/clubhub/committee/AssignmentHttpIntegrationTest.java`
   - Independent recipients, both requests through real HTTP/security/service/DB.
   - Independent COMMITTEE/PRESIDENT terms for one recipient, both requests through HTTP.
   - Fresh grant / partial-role revoke / final revoke using target's original SESSION,
     with explicit foreign-club denial and database/audit assertions.
   - Nanosecond server Clock normalized once to exact response/DB/audit microseconds.
2. `backend/src/test/java/com/tu/clubhub/committee/AssignmentInvariantIntegrationTest.java`
   - Native UPDATE tries extending an adjacent term into its neighbor; exact 23P01
     and `excl_committee_active_term` asserted. Native constraint tests use a fixture
     transaction only for cleanup, not as proof of production service rollback.

No test/production bypass flag or endpoint, no disabled tests, no weakened assertions.

## Concurrency / rollback quality

- HTTP cases use actual AuthController login, SESSION cookie, CSRF filters, current
  DB Admin/recipient checks, Service transaction proxy, JDBC repository and PostgreSQL.
  Only external TU authentication is a fictional-user fixture; no Service/Repository
  mocks pretend to prove locking. Classifier-only unit tests explicitly use mocks.
- Fixtures commit before worker threads; no enclosing test transaction. Every
  overlapping command has a distinct PG backend PID and transaction ID.
- Latches and PostgreSQL blocking-chain checks prove live overlap. The new
  independent-recipient test proves the second committed response arrives while the
  first transaction remains open; independent-role test proves actual DB waiting.
- No barrier demands both workers own the same exclusive row lock; no sleep is used.
  Futures/results/exceptions are collected and latches/waits/statements are bounded.
- Test-only audit trigger checks that real writes have already happened before
  raising the named failure. The waiting-retry case uses an advisory-lock coordinator
  to pause that post-write stage. New-transaction/JDBC reads after both responses
  check old/new rows, audit and permissions; unrelated data is preserved.
- Existing committee writer probe is a real explicit write transaction through
  ClubSecurity, not a mock HTTP handler. Admin request is actual HTTP. Existing
  `CommitteeRevocationConcurrencyIntegrationTest` also passes unchanged in full verify.
- All 24 HTTP invocations assert zero active pooled connections after explicit
  cleanup. Triggers, worker fixture rows and own sessions are removed after workers end.

## Native/bulk paths and boundaries

`AdminAssignmentRepository` is the only product assignment mutation caller found:
INSERT after profile/assignment/club/membership locks; conditional REVOKED UPDATE
with `WHERE version=? AND status='ACTIVE' AND revoked_at IS NULL`, incrementing
version; audit in the same service transaction. JPA assignment Entity/repository
provides constructor/read/guard queries but no other product mutation endpoint.

`scripts/dev-role.sh` is explicitly **DEV ONLY**, uses privileged SQL and can
bootstrap/reactivate membership, self-assign and backdate without Admin API reason/
audit. It is not an exposed HTTP path or a claimed policy-compliant production
assignment tool. V4 still blocks overlapping terms from its native INSERTs. Seed/
DBA SQL can bypass application expected-version/audit rules; full database privileges
are not a security boundary this API can enforce. Do not use dev-role for official
production assignment changes. No new bulk/native bypass was added in QA.

## Bugs and requirement gaps

**New Task78 bug list: none demonstrated.** The previously reported pre-V4 schema
gaps are historical implementation evidence, not a newly failing current QA case.
All current native/API/transaction cases pass.

Boundaries requiring team/operations review:

- Requester explicitly authorized the new Admin API/contract/migration; main lacked
  mutation capability. Formal endpoint/operational review is pending; the capability
  uses `feat` despite the requested `fix/assignment-concurrency` branch name.
- V4 needs btree_gist provisioning/database CREATE privilege. Current QA uses the
  repository's PostgreSQL administrator test role; restricted deployment roles and
  real existing overlapping data have **NOT RUN** validation on a production DB.
- Migration intentionally fails on existing unrevoked term overlaps; no automatic
  revocation/date rewrite/audit fabrication is specified. Operator must resolve data
  with reviewed evidence before rollout. Legacy appointment reason remains null.
- Default 2s lock timeout is an operational setting (test coordination uses 10s).
  Review deployment timeout value, not business-rule changes or automatic retries.
- Bootstrap, lifecycle revoke on LEFT/REMOVED, global-role management, dashboards
  and Admin UI remain separate. Current tests do not imply those workflows exist.
- No combined Task52/65/78 merge or GitHub CI has been run in this QA pass.

## Commands and actual results

Java21, dedicated PostgreSQL18 database `qa_task78`; V1/V2/V3/V4 migrated in this
new database. Test credentials stayed in a protected temporary env file.

| Command/check | Total | Passed | Failures | Errors | Skipped / not run |
|---|---:|---:|---:|---:|---|
| `./mvnw -Dtest=AssignmentRequestsTest,AssignmentServiceTest,AssignmentInvariantIntegrationTest,AssignmentHttpIntegrationTest test` | 57 | 57 (22 DTO + 7 classifier + 4 native + 24 HTTP) | 0 | 0 | 0 |
| Selected 9 HTTP concurrency invocations ×3 fresh QA repetitions | 27 | 27 | 0 | 0 | 0 |
| `./mvnw clean verify` | 588 | 588 | 0 | 0 | 0; BUILD SUCCESS, JAR/Jacoco produced |
| Sprint2 seed applied twice + verify_sprint2_seed.sql after tests | — | passed | 0 | 0 | 0 |
| Redocly, both specs | — | valid | 0 errors | — | 9 existing warnings |
| Duplicate-key YAML, OpenAPI/refs, 29 OpenAPI + 7 Markdown examples, DTO allowlists and unchanged existing contract comparison | — | passed | 0 | — | External Python tool deprecation/LibreSSL warnings only |
| DBML → temporary PostgreSQL SQL | — | passed | 0 | — | 0 |
| `git diff --check` and SHA256 production/API comparison | — | passed | 0 | — | no production/migration/contract changes |
| Frontend / remote CI / deployment / combined branches / PostgreSQL17 rerun in this QA | — | — | — | — | NOT RUN; previous implementation's PG17 run is historical evidence, not counted here |

Repeat selector (9 invocations because replace/revoke has two orders):

```sh
./mvnw '-Dtest=AssignmentHttpIntegrationTest#duplicateConcurrentAppointmentsCommitExactlyOneGrantAndAudit+twoAdminsReplacingOneVersionCannotLoseUpdates+replaceAndRevokeResolveByExpectedVersionWithoutResurrection+failedHolderRollsBackBeforeWaitingAdminReplacesOriginalVersion+revocationWaitsForExistingCommitteeWriterAndRemovesNextPermission+waitingAppointmentSamplesTimeAfterTheLockNotAtRequestStart+independentRecipientsInTheSameClubCanFinishWhileAnotherAssignmentIsLocked+independentPermissionRolesForOneRecipientSerializeWithoutFalseConflicts' test
```

Contract commands from root:

```sh
npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml
npx --yes --package @dbml/cli dbml2sql docs/database/TU-ClubHub-ERD-Updated.dbml --postgres -o /tmp/qa-task78-erd.sql
git diff --check
```

Evidence logs: `/private/tmp/clubhub-qa-task78-focused.log`,
`clubhub-qa-task78-repeat-{1,2,3}.log`, `clubhub-qa-task78-verify.log`,
`clubhub-qa-task78-seed.log`, `clubhub-qa-task78-openapi.log`,
`clubhub-qa-task78-contract.log`, `clubhub-qa-task78-dbml.log`;
final XML/Jacoco under `backend/target/`. No commit, push, PR or merge performed.

## QA cleanup

After all task runs, direct PostgreSQL checks confirmed **0 own fixture users**,
**0 task failure functions**, and **0 other open worker transactions** in each
separate QA database. The disposable QA container and private credential/runner
files were removed; existing demo containers were untouched. Non-secret logs and
Surefire reports remain for review. Production/contract file sets and hashes were
compared again after all three tasks and remained unchanged.
