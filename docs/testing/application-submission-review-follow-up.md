# Application submission — PR review follow-up

## Scope and baseline

Work performed on **2026-10-21**, starting from `dab86cd` on `feat/application-submission`, with a clean working tree. No applicable `AGENTS.md` was found; [COMMIT_RULES.md](../../COMMIT_RULES.md) applies. No commit or push was performed.

The supplied review covers service-only commit `b49d49d` / PR #55. The current branch already contains Task45's Controller, error handler, SESSION/CSRF HTTP tests and suspended-session invalidation through merge `dab86cd`. Those completed HTTP duties were verified and extended rather than reimplemented. The current OpenAPI POST implementation marker is corrected; GET application-form remains pending.

Business rules remain unchanged: SUBMITTED (Pending in UI), one application per student/round across all statuses, five effective club memberships, no round seat capacity, and `opensAt <= now < closesAt` with no manual close. No migrations, global Security changes, AuthController changes or frontend changes are included.

## Reproductions before production changes

Ran the same selected 10 regression executions against the original production code and then against the fixes, using Temurin JDK 21 and an isolated real PostgreSQL 18 database.

| Finding | Evidence before fix | Resolution |
|---|---|---|
| No production lock wait bound | HTTP timeout test no longer sets `lock_timeout`. A test-only 3-second statement timeout is a safety ceiling. Original code waited until that ceiling and returned 500 INTERNAL_ERROR with PostgreSQL statement cancellation, instead of expected 503 / SQLSTATE 55P03 | Set a validated, transaction-local lock timeout in the real Service before taking row locks |
| Constraint classification depends on message text | Driver-error unit tests: localized message without constraint name was rejected; another constraint whose message mentions the target was misclassified; generic text without structured metadata was trusted | Require SQLSTATE 23505 and `PSQLException.getServerErrorMessage().getConstraint()` equal to the exact target constraint |
| Suspended account loses precedence to malformed body | Authenticated suspended account with malformed JSON, unknown fields or an empty body returned 400 instead of 403 ACCOUNT_NOT_ALLOWED | Scoped body advice checks current account before Jackson decoding/empty-body rejection; existing handler invalidates its session |
| HTTPS example field code differs | Expected INVALID_HTTPS_URL but validator emitted INVALID | Emit INVALID_HTTPS_URL for semantic HTTPS URI validation; preserve other applicable field codes |

**Before:** 10 executions, **8 failures**, 0 errors, 0 skipped. **After:** the same 10 executions passed, 0 failures/errors/skipped. The invalid-path precedence case and wrapped-Jackson indexed-field case already passed before the fix; they are retained as regressions and are not claimed as newly discovered failures.

The localized-error tests construct actual PostgreSQL JDBC `ServerErrorMessage`/`PSQLException` objects with structured fields. They do not claim that a non-English PostgreSQL server locale was installed. The existing real PostgreSQL unique-constraint test separately verifies the actual repository exception path.

## Production changes

### 1. Bounded transaction-local lock wait

- [ApplicationSubmissionProperties.java](../../backend/src/main/java/com/tu/clubhub/application/config/ApplicationSubmissionProperties.java) binds `clubhub.application.submission.lock-timeout` with a **2s default**, including when the test YAML replaces the main YAML.
- [ApplicationSubmissionConfiguration.java](../../backend/src/main/java/com/tu/clubhub/application/config/ApplicationSubmissionConfiguration.java) enables these configuration properties following the existing TU configuration pattern.
- [application.yaml](../../backend/src/main/resources/application.yaml) exposes optional `APPLICATION_SUBMISSION_LOCK_TIMEOUT`.
- Reject null, zero, negative, sub-millisecond and greater-than-2147483647ms values rather than silently disabling or overflowing the timeout. Configuration tests verify binding, bounds and startup failures.
- [ApplicationService.java](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationService.java) applies the setting after resolving the authenticated user and before acquiring its first row lock, inside `submit`'s existing transaction.
- [ApplicationRepository.java](../../backend/src/main/java/com/tu/clubhub/application/repository/ApplicationRepository.java) uses parameterized `SELECT set_config('lock_timeout', ?, true)`. It changes only the current transaction and is restored after commit/rollback; it does not leak onto pooled connections. See [PostgreSQL configuration functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SET).
- This bounds **individual lock waits**, not total HTTP latency or connection acquisition, and is not a new business rule or quota. PostgreSQL documents a zero lock timeout as disabled and recommends appropriate per-session/application settings rather than a blanket server default: [lock timeout](https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-LOCK-TIMEOUT).
- Preserve exact 55P03/40P01 → 503 mapping, original internal cause, rollback and retry semantics. Do not relabel arbitrary SQL failures as duplicate/quota errors.

### 2. Structured duplicate metadata

`isRoundApplicantConflict` now requires PostgreSQL's structured constraint name and exact SQLSTATE. No error-message substring matching or English text fallback remains. Null metadata, another constraint, another SQLSTATE or a generic SQLException cannot be promoted to a duplicate conflict.

The PostgreSQL dependency in [pom.xml](../../backend/pom.xml) moves from runtime-only scope to the default compile scope so production code can use the driver's supported metadata API. Its version is unchanged and it remains included at runtime. Reference: [ServerErrorMessage.getConstraint](https://jdbc.postgresql.org/documentation/publicapi/org/postgresql/util/ServerErrorMessage.html#getConstraint--).

### 3. HTTP account-before-body ordering

[ApplicationRequestBodyAdvice.java](../../backend/src/main/java/com/tu/clubhub/application/controller/ApplicationRequestBodyAdvice.java) applies only to ApplicationController's request DTO. `beforeBodyRead` checks the authenticated account before JSON conversion; `handleEmptyBody` covers a missing body. It makes a nonlocking MVCC status read, avoiding a write lock while processing the HTTP body. It does not implement a second write transaction or move body parsing into the database lock window.

The precheck is not cached authorization. The Service re-reads account status **under FOR UPDATE** in the write transaction. `accountStatusIsRecheckedUnderLockAfterHttpPreflight` pauses after the preflight, commits a suspension on a separate connection, then verifies 403, session invalidation and no application rows. This guards against trusting an earlier Active status.

CSRF/session filters still run first. A suspended account with valid session/CSRF gets 403 before malformed-body errors, consistent with [API v1 §11](../api/API_v1.md#11-application-submission). Missing verified student status is still checked after syntactic request validation. No public permission is added.

### 4. Field errors and existing HTTP duties

[ApplicationSubmissionValidator.java](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationSubmissionValidator.java) now emits `INVALID_HTTPS_URL` for an invalid supplied URL string, matching the OpenAPI example. Structural wrong-type errors still use their applicable field code; FieldError.code remains a free string in the schema.

The existing scoped exception handler already unwraps the application validation exception from Jackson. `wrappedDtoValidationPreservesIndexedFieldErrors` verifies both the actual `HttpMessageNotReadableException` and `links[0].url` in the HTTP Problem body. The new URL HTTP test verifies the specific example code. Existing tests continue checking SESSION/CSRF, 201/Location/no-store, conflict reason, Problem fields and suspended-session invalidation.

## Test map

| Test class / method | Proof |
|---|---|
| [ApplicationRepositoryExceptionTest](../../backend/src/test/java/com/tu/clubhub/application/ApplicationRepositoryExceptionTest.java) | 3 executions: metadata versus localized/unrelated/unstructured message text |
| [ApplicationSubmissionConfigurationTest](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionConfigurationTest.java) | 9 executions: default/custom binding, invalid bounds, safe large-duration rejection |
| Validator: `invalidHttpsUrlUsesTheOpenApiExampleFieldCode` | INVALID_HTTPS_URL with the correct indexed field |
| Service: `submissionSetsProductionLockTimeoutOnlyForItsTransaction` | Real PostgreSQL setting is 2s inside the write transaction, restored afterward; committed application/history remain valid |
| HTTP: `realHttpLockTimeoutReturns503AndPoolAcceptsRetry` | Actual production timeout rather than test-injected lock_timeout; 55P03/503, rollback, restored settings and successful retry |
| HTTP: `suspendedAccountPrecedesBodyAndIdValidationAndInvalidatesSession` | Four cases: malformed, unknown field, empty body, invalid ID; account error has precedence and session is invalidated |
| HTTP: `wrappedDtoValidationPreservesIndexedFieldErrors` | Jackson wrapper is handled correctly without losing indexed errors |
| HTTP: `invalidHttpsUrlHttpErrorMatchesOpenApiExample` | Actual HTTP error matches the OpenAPI field-code example |
| HTTP: `accountStatusIsRecheckedUnderLockAfterHttpPreflight` | A concurrent status change cannot bypass locked Service authorization |

Existing concurrency, real deadlock, duplicate, rollback, unrelated-data preservation and cleanup assertions remain enabled. The tests do not mock Service/Repository or use H2 to claim PostgreSQL lock coverage. Clock/latches/wait-graph observations remain deterministic; no sleep is introduced.

## Commands and results

Provide `DB_PASSWORD` privately and point both `SEEDTEST_DATABASE_URL` and `ROUNDS_TEST_DATABASE_URL` at the dedicated PostgreSQL test database, following the existing repo setup. Do not commit generated credentials or use a shared production database for fault injection.

```bash
cd backend
./mvnw -Dtest=ApplicationRepositoryExceptionTest,ApplicationSubmissionConfigurationTest,ApplicationSubmissionValidatorTest,ApplicationServiceIntegrationTest,ApplicationSubmissionHttpIntegrationTest test
./mvnw clean verify
git diff --check
```

- Before/after selected regression: **8 failures → 0 failures** out of the same 10 executions.
- Focused current application suite: **125 executions passed**, 0 failures/errors/skipped (configuration 9, metadata 3, validator 38, Service 53, HTTP 22).
- Repeated concurrency/deadlock/timeout/account-race selection: **5 runs × 11 executions = 55 passed**, 0 failures/errors/skipped. This includes the production-configured lock timeout and both deadline boundaries.
- Full `./mvnw clean verify`: **376 tests passed**, 0 failures, 0 errors, 0 skipped; **BUILD SUCCESS**, packaged Spring Boot JAR and JaCoCo report produced.
- `python -m openapi_spec_validator docs/api/openapi.yaml`: **OK**.
- Existing Task42 contract-check script: duplicate-key YAML parsing, **102 resolved refs, 61 OpenAPI examples, 3 matching Markdown examples, 7 DTO allowlists, 33 negative schema checks**, unique operationIds/metadata and conflict reason checks passed. Python emitted environment/deprecation warnings; neither validator failed.
- `git diff --check`, new-file whitespace checks and report file links passed. No test was disabled or assertion reduced.
- Separate PostgreSQL queries after full verification found **zero** Task43/45 fixture users/clubs/rounds and zero injected function/trigger/constraints. Test cleanup also checked that HTTP workers returned all leased pool connections.

The dedicated PostgreSQL 18 container, its anonymous data volume and generated credential/runner files were removed after checking; the user's existing PostgreSQL 16 container on port 5433 was not modified. Reports under `backend/target/surefire-reports` are the final successful full-suite reports; before/after regression evidence is summarized above, with local logs retained in `/private/tmp/clubhub-review-before.log` and `/private/tmp/clubhub-review-after.log`.

The intentionally injected 500/503 responses are expected assertions inside passing tests. Test counts from focused/repeated/full runs overlap and must not be added as distinct tests.

## Remaining external checks and commit suggestions

GitHub Actions for these changes, deployed-server checks and reviewer re-approval are not claimed as completed. No automatic retry, application-history GET, GET application-form, per-round capacity or new student-status provisioning was added.

Suggested focused commits (English imperative, each subject at most 50 characters):

1. `fix(backend): bound submission lock waits` — configuration, transaction-local timeout and regression checks.
2. `fix(backend): classify duplicate constraint data` — driver metadata classifier and its tests, including dependency scope.
3. `fix(api): preserve submission validation order` — scoped body advice, account checks, HTTPS code alignment, related HTTP/unit regressions and matching contract notes.

No commit or push is performed by this task.
