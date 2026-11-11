# QA — Task65 committee application reads

Date: **2026-11-09**. Branch `feat/committee-application-review`, independent
worktree `TU_ClubHub_CS261-task65`, base and fetched origin/main `e2712a9`.
Fetch succeeded at the start of this QA pass; the branch is dirty with no upstream,
so no pull/checkout/merge/reset was performed. No applicable AGENTS.md found;
COMMIT_RULES.md, Task74/75 permissions, Task55 model/seed, Task65 card, API_v1 §13,
OpenAPI schemas, production code and existing tests were read. Task52 was reported
before beginning this task. Production/API contracts are unchanged in this QA pass.

## Verdict

**Ready for Task65 reviewer inspection on its own branch:** all locally executed
Task65 acceptance cases and full verification passed. No Task65 product defect
was demonstrated. This is not CI success, approval, deployment or proof of a
combined Task52/65/78 branch. QA52-001 concerns shared submission timestamp handling;
it is not a demonstrated defect of these GET projections.

## Case matrix

Methods are in `CommitteeApplicationHttpIntegrationTest` unless otherwise stated.
All PASS entries were executed in the current QA run.

| Case | Test method(s) | Result | Evidence |
|---|---|---|---|
| REVIEW-01 | `committeeAndPresidentReadOnlyTheirClubWithNecessaryApplicantFields`, `detailPairsQuestionsByIdPreservesOptionalGapsAndExcludesInternalData` | PASS | Correct club/application/applicant IDs, TEXT answers, optional nulls, ordered links and unchanged application/review/history snapshots; effective COMMITTEE/PRESIDENT |
| REVIEW-02 | `otherCommitteeOrdinaryUserAndGlobalAdminCannotReadOrProbeChildren` (both list/detail) | PASS | Actual other-club assignment does not authorize this club, 403; safe errors contain no foreign applicant details |
| REVIEW-03 | same method; `realJdbcSessionCookieAuthorizesTheStoredIdentityAndExpirationRejectsIt`; unit `globalAdminWithoutAssignmentCannotProbeChildExistence` | PASS | Ordinary and global Admin without grant 403; anonymous/expired SESSION 401; real filters enabled |
| REVIEW-04 | `validatesChildScopeWithoutDisclosingOtherApplicants`, `committeeOfBothClubsStillCannotMixParentAndApplicationIds` | PASS | Existing mismatched app/round 403 even when reviewer belongs to both clubs; absent child 404 only after parent permission |
| REVIEW-05 | `ineffectiveAssignmentsCannotReadEitherEndpoint` (9 states), `permissionIsRecheckedOnTheNextRequestAfterRevocation`, new `realSessionLosesPermissionAfterCommittedRevocationBetweenFreshHttpTransactions` | PASS | Revoked/expired/future terms, invalid membership/student/club/account denied; new own transactions and retained real SESSION lose club permission after committed revoke without global logout |
| REVIEW-06 | `statusRoundAndLiteralCaseInsensitiveSearchFiltersAreCombined`, new `exactStatusAndRoundFiltersExcludeOtherStatesRoundsAndClubs` (8 statuses), `invalidQueriesAreSafe400Problems` | PASS | Status, round, their combination, literal q/student-code search, wrong-club round, invalid enum/ID/type/range; totals exclude nonmatching/foreign/self-review data |
| REVIEW-07 | `filtersBeforePagingCountsNoForeignOrSelfReviewRoundsAndUsesStableTieBreaker`, new `manyPagesWithMultipleAnswersAndLinksDoNotDuplicateOrLoseApplications`, new `httpReadUsesItsOwnReadOnlyRepeatableSnapshotWithCommittedFixtures` | PASS | 7 matching applications over 3 pages, no duplicate/missing IDs, multiple answers/links do not inflate count; stable equal-time ID tie-break; out-of-range empty page retains total; own read-only REPEATABLE READ snapshot confirmed |
| REVIEW-08 | exact JSON allowlists in the first two tests; new `detailCannotMixAnotherApplicantAnswersOrDocumentsFromTheSameRound` | PASS | Nested applicant/question/link allowlists; no reviewer/decision identities, internal comment, account credentials or unrelated same-round answer/document; Unicode/multiline text and nullable optional data preserved |
| REVIEW-09 | same detail/scope tests, production route scan and API_v1 §13 document mechanism | PASS for actual local API; remote download NOT RUN | Authorized detail exposes its own stored HTTPS document URLs only. Unauthorized list/detail is blocked. No download proxy, storage reference, signed URL or upload endpoint exists; external provider ACL/URL opening is not a backend capability being claimed tested |

Additional executed cases: no implicit UNDER_REVIEW write, explicit DRAFT/CANCELLED
conflicts, open/closed published read availability, self-review in any status
(including WITHDRAWN), exact assignment-start boundary, safe malformed bigint IDs,
Unicode query length, and no old round-scoped GET aliases.

## Added tests / fixture changes

Only `backend/src/test/java/com/tu/clubhub/application/CommitteeApplicationHttpIntegrationTest.java`
and this report changed during QA. **12 test invocations added**:

- 8 exact status/round/club filter cases using schema-valid decision/response fields.
  These are fixture states for query testing, not a claim that future decision APIs work.
- One 3-page / 7-application case, with two answers and two links per application.
- One same-round applicant isolation case for answers and document IDs/URLs.
- One real service-owned read-only transaction/snapshot case.
- One fresh HTTP transaction / stored SESSION / committed revocation case.

Original tests use an outer transaction to isolate read fixtures. The two new
transaction-boundary cases explicitly commit those fixtures with TestTransaction
and end the test transaction **before** HTTP calls. Their helpers track own users,
clubs and SESSION IDs and manually delete child rows in FK order after workers end;
they do not rely on test-level rollback for committed work. Ordinary read tests
retain the existing automatic fixture rollback. No assertions were removed or weakened.

The snapshot test inspects actual PostgreSQL `transaction_isolation=repeatable read`
and `transaction_read_only=on` in the service transaction. A bounded latch holds
that transaction with its snapshot while another connection commits an applicant.
The original request sees its original count/items and a later request sees the new
row. This is test-only transaction instrumentation, not a mock Repository or Service.

The SESSION test issues both endpoints through real filters, commits a revoke via
fixture SQL, then repeats both requests in fresh transactions. Both return 403 while
the user's SESSION remains valid. No new Admin implementation is imported from Task78.

## Bugs and requirement gaps

**Task65 bug list: none demonstrated.** Existing tests plus added cases passed.
This does not prove absence of all defects outside the executed scope.

Requirements/implementation boundaries, separately from bugs:

- User-confirmed club-scoped GETs replace the previously unimplemented round-scoped
  read contracts; formal team/PO approval remains pending.
- User-confirmed read DTOs exclude reviewer identities/internal notes. Necessary
  applicant identity, submitted answers and HTTPS URLs remain explicitly allowed.
- External document ACL/ownership/expiry is controlled by the originating website.
  If the product needs protected download mediation or signed URLs, it needs its
  own confirmed contract/storage design. No such guarantees were fabricated here.
- No assignment `INACTIVE` enum exists: ACTIVE (with effective dates) and REVOKED
  are the real states; inactive membership/student/account cases are covered.
- Applicant status-change, selection/publication, member confirmation and Task66 UI
  are outside these read endpoints. Reads do not implement them implicitly.
- Task52/65 shared path/advice/contract integration still needs an authorized merge
  and combined verification. Individual green suites are not combined-branch proof.

## Commands / actual results

Java21, dedicated PostgreSQL18 database `qa_task65`, separate from the Task52/78
schema and existing user demo containers. Environment credentials were not printed.

| Command/check | Total | Passed | Failures | Errors | Skipped / not run |
|---|---:|---:|---:|---:|---|
| `./mvnw -Dtest=CommitteeApplicationServiceTest,CommitteeApplicationHttpIntegrationTest test` | 60 | 60 (9 unit + 51 HTTP/PG) | 0 | 0 | 0 |
| Two committed-fixture transaction cases ×3 fresh QA repetitions | 6 | 6 | 0 | 0 | 0 |
| `./mvnw clean verify` | 591 | 591 | 0 | 0 | 0; BUILD SUCCESS, JAR/Jacoco produced |
| Redocly, both specifications | — | valid | 0 errors | — | 9 existing warnings |
| YAML/OpenAPI spec/refs validation, both docs | — | passed | 0 | — | Python system LibreSSL warning only |
| `git diff --check` and SHA256 of production/contract files | — | passed | 0 | — | no product/API changes |
| Frontend checks / GitHub Actions / combined branches / external URL downloads | — | — | — | — | NOT RUN; outside changed logic or not published |

Repeat command:

```sh
./mvnw '-Dtest=CommitteeApplicationHttpIntegrationTest#httpReadUsesItsOwnReadOnlyRepeatableSnapshotWithCommittedFixtures+realSessionLosesPermissionAfterCommittedRevocationBetweenFreshHttpTransactions' test
```

Redocly command from root:

```sh
npx --yes @redocly/cli@1.34.5 lint docs/api/openapi.yaml docs/api/rounds.openapi.yaml
git diff --check
```

Evidence: `/private/tmp/clubhub-qa-task65-focused.log`,
`clubhub-qa-task65-repeat-{1,2,3}.log`, `clubhub-qa-task65-verify.log`,
`clubhub-qa-task65-openapi.log`; final XML/Jacoco under `backend/target/`.
Task65 results were reported before beginning Task78. No commit, push, PR or merge.

## QA cleanup

After all task runs, direct PostgreSQL checks confirmed **0 own fixture users**,
**0 task failure functions**, and **0 other open worker transactions** in each
separate QA database. The disposable QA container and private credential/runner
files were removed; existing demo containers were untouched. Non-secret logs and
Surefire reports remain for review. Production/contract file sets and hashes were
compared again after all three tasks and remained unchanged.
