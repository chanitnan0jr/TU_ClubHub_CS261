# U07 — Task21 BE-1 / BE-2 และ Task22 FS-1 / BE-1

> Prepared from the uploaded TU ClubHub repository snapshot on 2026-10-18. This is a proposed change set, **not** an approved PR, CI pass, or completed independent code review.

## Summary by task

| Task | Delivered in this change set | Still required before marking Done |
|---|---|---|
| Task21-BE-1 | Additional fixed-clock Unit Tests for opening/closing boundaries, invalid date offsets, optimistic version conflict, permissions, duplicate close and publish behavior; Controller authorization tests. Existing DB integration tests are retained. | Run tests against PostgreSQL and record actual results. Confirm TC-07-01 through TC-07-08 with QA. |
| Task21-BE-2 | Fix: repeated `CLOSE` with the current version on an already manually closed round previously returned success (`200`) even though the API contract permits CLOSE only on accepting rounds; now returns `409 Conflict`. Fix the Windows CRLF Maven wrapper that fails on Linux. | Verify the behavior against product acceptance criteria and CI before closing defects. |
| Task22-FS-1 | JaCoCo HTML/XML coverage report in Maven verify; GitHub Actions artifact upload of Surefire reports and JaCoCo coverage; branch/PR checklist below. | Open the PR in GitHub, run real CI, and record coverage figures from report. |
| Task22-BE-1 | Static-review findings below for architecture, API/authorization, missing endpoints and documentation mismatch. | An **independent reviewer** must perform/approve the PR review before merging to main. |

## Code paths reviewed

- `backend/src/main/java/com/tu/clubhub/recruitment/service/RecruitmentRoundService.java`
- `backend/src/main/java/com/tu/clubhub/recruitment/repository/RecruitmentRoundRepository.java`
- `backend/src/main/java/com/tu/clubhub/recruitment/controller/RecruitmentRoundController.java`
- `backend/src/main/java/com/tu/clubhub/club/repository/ClubProfileQueryRepository.java`
- `backend/src/main/java/com/tu/clubhub/committee/security/ClubSecurity.java`
- `backend/src/main/java/com/tu/clubhub/committee/repository/ClubCommitteeAssignmentRepository.java`
- `.github/workflows/ci.yml`, `backend/pom.xml`, `docs/api/rounds.openapi.yaml`

## Testing details

Additional automated scenarios:

1. Publishing a draft just before `closesAt` succeeds.
2. Publishing at exactly `closesAt` returns 409 (exclusive close boundary).
3. Publishing an already published round returns 409.
4. Closing at exactly `opensAt` succeeds (inclusive open boundary).
5. Closing an already manually closed round returns 409 and does not write.
6. Race/optimistic-version conflict on close returns 409.
7. Stale version cannot publish.
8. Non-committee access cannot create/update/publish/close, at both service and controller layers.
9. Offset timestamps denoting the same instant cannot create a zero-length window.

Already-existing tests include public-list time filtering (`ClubProfileQueryRepositoryTest`), round lifecycle with PostgreSQL (`RecruitmentRoundServiceIntegrationTest`), and preservation of application answers/history when closing. These must be rerun, not assumed passing from their presence in the ZIP.

Manual QA for **TC-07-01 to TC-07-08** is not marked complete: the concrete expected results and executed test evidence were not present in the provided source snapshot.

### Important limitation: application submission after close

The supplied `backend/src/main/java/com/tu/clubhub/application/` module contains only `.gitkeep`. There is **no submitted application service/controller in this snapshot** to reject writes after `closesAt` or `closedAt`. The existing public listing SQL correctly filters by `publication_status`, `opens_at`, `closes_at`, and `closed_at`, but UI visibility **is not a substitute for server-side submission authorization**. This task is blocked until application submission code is available, and should not be reported as passed.

### Time Conflict scope

Current implemented timeline validation requires `opensAt < closesAt < confirmationDeadline` and optional `resultsScheduledAt` in `[opensAt, confirmationDeadline)`. Version collisions are handled with the `version` column. **Overlapping rounds within the same club** have no restriction in the reviewed code; no overlap policy is documented in this snapshot, so no new rule was invented. Agree with the System Analyst whether same-club overlapping windows should be forbidden.

## Review observations / remaining risks

- `RoundPatchRequest.Action.CANCEL` exists but `RecruitmentRoundController` returns 400 for CANCEL, while `docs/api/rounds.openapi.yaml` describes CANCEL as supported. The OpenAPI also lists `GET` round operations that are not implemented in the current recruitment controller. Align API implementation and docs in a separate scoped task or have SA confirm release scope.
- Controller endpoints use `@RequireClubCommittee`; the service checks committee membership again. This is appropriate defense-in-depth. CSRF protection is configured for state-changing HTTP requests.
- Service-level writes use `@Transactional`, database row locks (`FOR UPDATE`) and `version` checking. Public listing enforces effective time bounds and manual close in SQL.
- `backend/mvnw` in the uploaded ZIP had `CRLF` line endings. On Linux the shell script could not execute; the script has been normalized to LF with a `.gitattributes` rule to retain LF in Git checkouts.
- Unit coverage is now reportable by JaCoCo after successful Maven verify. **No minimum coverage threshold was introduced** without team agreement.
- Main branch merge is subject to another developer's code review and passing CI. This change set does not constitute approval.

## How to run (Windows Git Bash)

```bash
# On a feature branch created from latest origin/main, copy the change-set files.
cd backend
./mvnw.cmd clean verify
# or if using Git Bash with a working POSIX wrapper:
./mvnw clean verify
```

Use a running PostgreSQL test database `tu_clubhub_test` on port 5432 and set `DB_PASSWORD` in the shell. The existing integration suite requires a real PostgreSQL database. CI provisions the service itself.

Coverage: `backend/target/site/jacoco/index.html` after successful verify. Unit test reports: `backend/target/surefire-reports`.

## Suggested Git workflow

```bash
git fetch origin
git switch feature/u07-task21-22-testing-review
# Copy changed files over this branch, then:
git status
git add .gitattributes .github/workflows/ci.yml backend/mvnw backend/pom.xml \
  backend/src/main/java/com/tu/clubhub/recruitment/service/RecruitmentRoundService.java \
  backend/src/test/java/com/tu/clubhub/recruitment \
  docs/testing/task21-task22-u07-handoff.md
git commit -m "test(u07): cover lifecycle, authorization and time boundaries"
git push -u origin feature/u07-task21-22-testing-review
```

Open **one** PR to `main`, link all four task IDs, request Lead Backend review, and merge only when reviewer approval and required CI checks are green. Note: the single commit command above is the simplest choice; splitting into more descriptive commits is fine but not mandatory.

## Validation performed in preparation

- Inspected source and test files and existing documentation: **done**.
- Confirmed `backend/mvnw` initially had all-CRLF line endings: **done**.
- Confirmed Maven Wrapper launches after converting script to LF, but Maven distribution download failed due to network restriction in the preparation environment: **blocked**.
- Spring integration tests, complete Maven verify, CI, JaCoCo coverage and PR review: **not run / not confirmed**.
