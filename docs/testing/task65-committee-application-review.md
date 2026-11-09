# Task65 — Committee application review

## Scope, base and decisions

- Branch: `feat/committee-application-review`, independently based on `main`
  `e2712a9`. Fetched and fast-forward pulled before starting; worktree was clean.
- Worktree: `/Users/mac/Documents/code/project/TU_ClubHub_CS261-task65`.
  Task52's uncommitted changes remain in the original worktree; none were stashed,
  overwritten or silently included. No commit, push or PR has been made.
- No applicable `AGENTS.md` was found. Followed `COMMIT_RULES.md` and the existing
  controller → service → JDBC projection architecture.
- Dependencies exist in main: Task74/75 design and permission matrix; Task55
  `sprint2_seed.sql` and verification script. No stacked base is needed.
- **Requester decisions on 2026-11-08:** use the task's club-scoped GETs, replacing
  the unimplemented Task75 round-scoped GET contracts without aliases; exclude
  reviewer identities and internal notes from these read responses.
- PO/team review is still pending; recorded task decisions are not formal approval.

## API behavior

See [API §13](../api/API_v1.md#13-committee-application-reads-task65) and
[OpenAPI](../api/openapi.yaml).

| Operation | Response |
|---|---|
| `GET /api/v1/clubs/{id}/applications` | `200 CommitteeClubApplicationPage`: `{items, page}`; each item contains `id`, `roundId`, necessary applicant projection, `status`, UTC `submittedAt` |
| `GET /api/v1/clubs/{id}/applications/{appId}` | `200 CommitteeClubApplicationDetail`: IDs, same applicant projection, motivation, question/answer pairs, document links, status and UTC submittedAt |

- Require SESSION, current ACTIVE account and the actual effective
  COMMITTEE/PRESIDENT grant in the path club. Existing `ClubSecurity` evaluates
  account/student/club/membership/assignment state and `[starts_at, ends_at)`.
  Global ADMIN alone is insufficient; no authorization cache is added.
- Parent authorization precedes child existence/state checks. A caller without
  an effective club grant gets 403 without probing child IDs. After authorization,
  absent children return 404 and existing foreign children return 403, including
  when the caller happens to have grants in both clubs.
- Filter SQL by club, optional roundId/status/literal case-insensitive `q` and
  PUBLISHED rounds with published_at, excluding **entire self-review rounds** in
  any application status, before count and pagination. Count/list share one
  predicate. Stable sorting is submitted_at ASC, id ASC; pages are zero-based,
  default size 20, maximum 100. No in-memory cross-club filtering or multiplied JOINs.
- Explicit self-review/foreign round is 403; missing round is 404;
  explicit DRAFT/CANCELLED is 409 with ROUND_NOT_PUBLISHED/ROUND_CANCELLED.
  Published rounds remain readable after closing; these are not Public API reads.
- Pair answers by question ID; optional omissions remain null and do not shift
  later answers. Document links use existing URL-only attachments; no download
  proxy, upload, storage references or external URL request is added.
- Dedicated DTOs exclude reviews/internalComment, reviewer/decision identities,
  resultMessage, statusHistory/audit reasons, management versions, credentials
  and account/profile entities. Nested schemas are allowlisted too.
- Service-owned read-only REPEATABLE READ snapshot keeps grants, count/items and
  detail queries consistent. GET never changes application state/history/results.
  All responses use no-store and the existing Problem error format.

## Changed files

Production package prefix: `backend/src/main/java/com/tu/clubhub/application/`.

| File(s) | Purpose |
|---|---|
| `controller/CommitteeApplicationController.java` | Two club-scoped GET entry points and no-store headers |
| `controller/ApplicationExceptionHandler.java` | Share existing safe Problem/status/reason handling with the new controller |
| `service/CommitteeApplicationService.java` | Current user/grant checks, scoped child checks, read-only snapshot and query validation |
| `repository/CommitteeApplicationRepository.java` | Typed JDBC projections; shared SQL filter for count/list; scoped detail and ordered question/link queries |
| `dto/CommitteeClubApplicationSummary.java`, `CommitteeClubApplicationPage.java`, `CommitteeClubApplicationDetail.java` | Explicit minimal response models and nested records, with immutable collections |
| `backend/src/test/java/com/tu/clubhub/application/CommitteeApplicationServiceTest.java` | Direct service guard/order/query tests |
| `backend/src/test/java/com/tu/clubhub/application/CommitteeApplicationHttpIntegrationTest.java` | Real filters, grant queries, service and PostgreSQL through MockMvc |
| `docs/api/openapi.yaml`, `docs/api/API_v1.md` | New read contract; remove unimplemented round GETs/list-only schemas; preserve submission and future writes |
| `docs/architecture/task75-sprint2-design.md`, `docs/security/permission-matrix.md`, `docs/tasks/sprint2/Task65.md`, `README.md`, this report | Record decisions, architecture/permission mapping and review handoff |

No frontend, security whitelist, migration or business write path was changed.

## Acceptance criteria → test methods

HTTP methods below are in `CommitteeApplicationHttpIntegrationTest` unless noted.

| Criterion | Evidence |
|---|---|
| Committee/PRESIDENT sees only own club | `committeeAndPresidentReadOnlyTheirClubWithNecessaryApplicantFields`: exact item ID, round ID, UTF-8 text, typed IDs/date/status, nullable fields, totals and unchanged business snapshots |
| Necessary detail, correct question/answer pairing, links | `detailPairsQuestionsByIdPreservesOptionalGapsAndExcludesInternalData`: out-of-order inserts, optional gap, Thai/emoji/multiline answers, exact link, DB review note deliberately present but absent in JSON, exact nested key sets, unchanged snapshots |
| Other committee, ordinary user and global ADMIN denied | `otherCommitteeOrdinaryUserAndGlobalAdminCannotReadOrProbeChildren` tests both operations and absent-child probing |
| Real assignment state/term controls | `ineffectiveAssignmentsCannotReadEitherEndpoint`: revoked, exact expiry, future term, inactive/future/ended membership, inactive student/club, suspended account |
| Inclusive term start and prompt revoke effect | `assignmentStartsInclusivelyAtTheCurrentServerInstant`, `permissionIsRecheckedOnTheNextRequestAfterRevocation` |
| Anonymous/expired SESSION denied | Anonymous cases above; `realJdbcSessionCookieAuthorizesTheStoredIdentityAndExpirationRejectsIt` seeds a server-side JDBC session context, calls both APIs by cookie, expires it, then asserts 401 |
| Filter before pagination/count, stable ties, no foreign rows | `filtersBeforePagingCountsNoForeignOrSelfReviewRoundsAndUsesStableTieBreaker`: multiple pages with tied timestamps, hidden WITHDRAWN self-review round, foreign/draft/cancelled data, exact IDs/totals, very large out-of-range page |
| Status/round/q filters and safe parameterization | `statusRoundAndLiteralCaseInsensitiveSearchFiltersAreCombined`: exact matches, student code, no-match and literal SQL-like/%/_ searches |
| Cross-club ID substitution | `validatesChildScopeWithoutDisclosingOtherApplicants`, `committeeOfBothClubsStillCannotMixParentAndApplicationIds` |
| Missing authorized child and round state | Above plus `explicitUnavailableRoundReturnsConflictForListAndDetail` |
| No stale self-review cache | `selfReviewAppearingAfterAReadHidesTheEntireRoundOnNextRequest` |
| Empty closed published round and Unicode search length | `emptyPublishedClosedRoundIsReadableAndSearchLengthCountsUnicode` |
| ID/query errors do not become 500 | `invalidQueriesAreSafe400Problems`, `invalidClubAndApplicationIdsNeverBecome500` |
| No round-scoped GET alias | `unimplementedRoundScopedReadsAreNotExposedAsAliases`; existing round POST still allowed |
| Service cannot bypass parent/auth guards | `CommitteeApplicationServiceTest`: direct anonymous calls, global ADMIN without grant, foreign/self-review scope; verifies no child/count/detail query before authorization |

## Actual local validation — 2026-11-08

Temurin Java 21, dedicated PostgreSQL **18** container, private datasource
environment. PostgreSQL is asserted by the HTTP test fixture. Most permission
cases use a test SecurityContext with real stored user/grant data; the dedicated
cookie case uses actual JDBC session storage. TU login integration is covered by
the existing suite; these tests do not claim to call the university service.
Test fixtures are isolated by the repository's transactional rollback approach;
no concurrent workers or test sleeps are introduced in this read-only feature.

| Check | Actual result |
|---|---|
| Relevant `./mvnw -Dtest=CommitteeApplicationServiceTest,CommitteeApplicationHttpIntegrationTest test` | **48 passed**: 9 unit + 39 HTTP/PostgreSQL cases; zero failures/errors/skipped |
| `./mvnw clean verify` | **579 passed**, zero failures/errors/skipped; JAR and JaCoCo report generated |
| CI Redocly command for both OpenAPI documents | Valid, zero errors; same 9 existing warnings as main |
| YAML/OpenAPI validator, schema/examples and nested refs | Both versions valid (3.1.0 and 3.0.3); 14 reachable response examples plus 4 Markdown examples validate; internal fields rejected; old GET aliases absent |
| Task55 seed applied twice + `verify_sprint2_seed.sql` | Passed after Maven tests, following integration CI order; idempotency/invariants checked in the disposable DB |
| `git diff --check` and whitespace check for new files | Passed |

**Failed final checks:** none. **Not run:** frontend checks (no frontend changes),
GitHub Actions (not pushed), PO/reviewer acceptance (not performed). The 579 count
belongs to this independent Task65 branch, not a combined Task52/65 release.

Reproduce using PostgreSQL as configured in `.github/workflows/ci.yml`; set
`DB_PASSWORD` privately and `SEEDTEST_DATABASE_URL` / `ROUNDS_TEST_DATABASE_URL`
when host/port differs. Run Maven from `backend/`. Do not use a shared production
database for tests or seed verification.

## Prepared PR and focused commits — not created

**PR title:** `feat(api): add committee application review`

### Task65 — REVIEW-01

- Add club-scoped list/detail reads under current effective committee grants.
- Apply club, round, status, literal search and self-review filters in SQL before
  count/paging; retain stable submittedAt/id ordering and safe scoped errors.
- Return dedicated read DTOs with correctly paired questions/answers and URL
  attachments; exclude internal notes, reviewer data and unrelated account fields.
- Preserve read-only behavior, published closed-round access and no-store headers.
- Update OpenAPI/Markdown together for the requester-confirmed paths and data scope.
- Validation: 48 focused tests and 579 total passed; OpenAPI valid with 9 existing
  warnings; Task55 seed verification and diff check passed. CI/review are pending.

**Reviewer walkthrough:** run the focused tests; inspect exact JSON allowlists
and unchanged snapshots; inspect the identical SQL predicate for count/list;
exercise other-club/expired/revoked/self-review actors and mixed parent/child IDs.

**Integration note:** Task52 and Task65 are independent branches from main with
uncommitted work. When integrating after authorization, preserve both POST and
GET on the shared club path and both controllers in the scoped exception advice.
Resolve shared OpenAPI/Markdown edits together and verify the combined branch;
that combined merge has not been performed or validated here.

Proposed subjects (English Conventional Commits, all ≤50 characters):

1. `feat(api): add committee application review` — controller/service/repository/DTO/advice.
2. `test(api): cover committee access rules` — unit and HTTP/PostgreSQL tests.
3. `docs(api): define committee read contracts` — OpenAPI and Markdown contract,
   related design/permission/card/README changes and this report.
