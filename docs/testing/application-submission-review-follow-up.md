# Application submission — PR review follow-up

This record covers commit `1053c14`, which fixed the PR #55 review findings for service-only commit `b49d49d`, and the follow-up after `main` was merged into `feat/application-submission`. The Controller, error handler, SESSION/CSRF HTTP tests and suspended-session invalidation came from Task45 (merge `dab86cd`) and were extended, not reimplemented.

Business rules did not change: SUBMITTED (Pending in UI), one application per student/round across all statuses, five effective club memberships, no round seat capacity, and `opensAt <= now < closesAt` with no manual close. No migrations or frontend changes are included.

## Findings and resolutions

The same 10 selected regression executions were run against the code before and after `1053c14`, with JDK 21 and an isolated PostgreSQL 18 database.

| Finding | Evidence before the fix | Resolution |
|---|---|---|
| No production lock wait bound | The HTTP timeout test no longer sets `lock_timeout`; a test-only 3-second statement timeout is the safety ceiling. The original code waited until that ceiling and returned 500 INTERNAL_ERROR instead of 503 / SQLSTATE 55P03 | Set a validated, transaction-local lock timeout in the Service before taking row locks |
| Constraint classification depends on message text | Driver-error unit tests: a localized message without the constraint name was rejected, another constraint whose message mentions the target was misclassified, and generic text without structured metadata was trusted | Require SQLSTATE 23505 and `PSQLException.getServerErrorMessage().getConstraint()` equal to the target constraint |
| Suspended account loses precedence to a malformed body | A suspended account with malformed JSON, unknown fields or an empty body got 400 instead of 403 ACCOUNT_NOT_ALLOWED | `1053c14` added a body advice that read the account before JSON decoding. After `main`'s `ActiveAccountFilter` was merged, the filter makes this check, so `cfd2167` removed the advice |
| HTTPS example field code differs | Expected INVALID_HTTPS_URL, but the validator emitted INVALID | Emit INVALID_HTTPS_URL for semantic HTTPS URI validation; other field codes are unchanged |

**Before:** 10 executions, **8 failures**, 0 errors, 0 skipped. **After:** the same 10 executions passed. The invalid-path precedence case and the wrapped-Jackson indexed-field case already passed before the fix; they are kept as regressions, not counted as new failures.

The localized-error tests build real PostgreSQL JDBC `ServerErrorMessage`/`PSQLException` objects with structured fields; they do not install a non-English server locale. The existing real PostgreSQL unique-constraint test covers the actual repository exception path.

## Changes

### 1. Bounded transaction-local lock wait

- [ApplicationSubmissionProperties.java](../../backend/src/main/java/com/tu/clubhub/application/config/ApplicationSubmissionProperties.java) binds `clubhub.application.submission.lock-timeout` with a **2s default**, also when the test YAML replaces the main YAML. [application.yaml](../../backend/src/main/resources/application.yaml) exposes `APPLICATION_SUBMISSION_LOCK_TIMEOUT`.
- Null, zero, negative, sub-millisecond and greater-than-2147483647 ms values fail at startup instead of disabling or overflowing the timeout.
- [ApplicationService.java](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationService.java) applies the setting inside `submit`'s transaction, after resolving the user and before the first row lock. [ApplicationRepository.java](../../backend/src/main/java/com/tu/clubhub/application/repository/ApplicationRepository.java) uses a parameterized `SELECT set_config('lock_timeout', ?, true)`, which lasts only for the current transaction and does not leak onto pooled connections ([PostgreSQL configuration functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SET)).
- The bound applies to each lock wait, not to total HTTP latency or connection acquisition, and is not a business rule or quota ([lock_timeout](https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-LOCK-TIMEOUT)). SQLSTATE 55P03 and 40P01 still map to 503 with rollback; other SQL failures are not relabeled.

### 2. Structured duplicate metadata

`isRoundApplicantConflict` requires PostgreSQL's structured constraint name and the exact SQLSTATE; no message-text matching remains. Null metadata, another constraint, another SQLSTATE or a generic `SQLException` is not treated as a duplicate.

The PostgreSQL driver in [pom.xml](../../backend/pom.xml) moved from runtime to compile scope so production code can call [ServerErrorMessage.getConstraint](https://jdbc.postgresql.org/documentation/publicapi/org/postgresql/util/ServerErrorMessage.html#getConstraint--). Its version is unchanged.

### 3. Account check before the body

[ActiveAccountFilter](../../backend/src/main/java/com/tu/clubhub/config/ActiveAccountFilter.java) runs after the CSRF filter and before the controller reads the body. For a suspended account it invalidates the session and returns 403 ACCOUNT_NOT_ALLOWED, matching checks 1–3 in [API v1 §11](../api/API_v1.md#11-application-submission). Missing verified student status is still checked after request validation.

The filter's read is not cached authorization: the Service re-reads the account **under FOR UPDATE** in the write transaction. `accountStatusIsRecheckedUnderLockAfterHttpPreflight` pauses after the filter's read, commits a suspension on another connection, then verifies 403, session invalidation and no application rows.

### 4. Field errors

[ApplicationSubmissionValidator.java](../../backend/src/main/java/com/tu/clubhub/application/service/ApplicationSubmissionValidator.java) emits `INVALID_HTTPS_URL` for a `url` string that fails HTTPS URI validation, matching the OpenAPI example. A missing or non-string `url` is rejected earlier by the JSON factory with its own code.

The scoped exception handler unwraps the validation exception from Jackson. `wrappedDtoValidationPreservesIndexedFieldErrors` checks both the `HttpMessageNotReadableException` and `links[0].url` in the Problem body.

## Test map

| Test class / method | Proof |
|---|---|
| [ApplicationRepositoryExceptionTest](../../backend/src/test/java/com/tu/clubhub/application/ApplicationRepositoryExceptionTest.java) | 3 executions: metadata versus localized, unrelated and unstructured message text |
| [ApplicationSubmissionConfigurationTest](../../backend/src/test/java/com/tu/clubhub/application/ApplicationSubmissionConfigurationTest.java) | 9 executions: default/custom binding, invalid bounds, large-duration rejection |
| Validator: `invalidHttpsUrlUsesTheOpenApiExampleFieldCode` | INVALID_HTTPS_URL with the correct indexed field |
| Service: `submissionSetsProductionLockTimeoutOnlyForItsTransaction` | The PostgreSQL setting is 2s inside the write transaction and restored afterward |
| HTTP: `realHttpLockTimeoutReturns503AndPoolAcceptsRetry` | The production timeout, not a test-injected one, gives 55P03/503 with rollback, restored settings and a successful retry |
| HTTP: `suspendedAccountPrecedesBodyAndIdValidationAndInvalidatesSession` | Malformed, unknown-field, empty-body and invalid-ID cases: the account error wins and the session is invalidated |
| HTTP: `wrappedDtoValidationPreservesIndexedFieldErrors` | The Jackson wrapper keeps indexed field errors |
| HTTP: `invalidHttpsUrlHttpErrorMatchesOpenApiExample` | The HTTP error matches the OpenAPI field-code example |
| HTTP: `accountStatusIsRecheckedUnderLockAfterHttpPreflight` | A concurrent suspension cannot bypass the locked Service check |

The existing concurrency, deadlock, duplicate, rollback and cleanup assertions remain enabled. The tests use a real PostgreSQL database, not H2 or mocked Service/Repository classes, for lock coverage, and use clocks and latches rather than sleeps.

## Commands and results

Set `DB_PASSWORD` and point `SEEDTEST_DATABASE_URL` and `ROUNDS_TEST_DATABASE_URL` at a dedicated PostgreSQL test database, as in the existing repo setup.

```bash
cd backend
./mvnw -Dtest=ApplicationRepositoryExceptionTest,ApplicationSubmissionConfigurationTest,ApplicationSubmissionValidatorTest,ApplicationServiceIntegrationTest,ApplicationSubmissionHttpIntegrationTest test
./mvnw clean verify
```

At `1053c14`:

- Before/after selected regression: **8 failures → 0 failures** out of the same 10 executions.
- Application suite: **125 executions passed** (configuration 9, metadata 3, validator 38, Service 53, HTTP 22).
- Concurrency, deadlock, timeout and account-race selection repeated 5 times: **55 executions passed**.
- Full `./mvnw clean verify`: **376 tests passed**, 0 failures, 0 errors, 0 skipped. The pull-request CI run also passed.
- OpenAPI validation and the Task42 contract-check script passed. After the full run, no Task43/45 fixture rows or injected functions, triggers or constraints remained, and HTTP workers returned all pool connections.

After merging `main` and removing the body advice (`cfd2167`): full `./mvnw clean verify` passed **404 tests**, 0 failures, 0 errors, 0 skipped, against PostgreSQL 17.

Test counts from the focused, repeated and full runs overlap; do not add them together. The 500/503 responses in these runs are expected assertions inside passing tests.

## Not included

No automatic retry, application-history GET, GET application-form, per-round capacity or new student-status provisioning was added.
