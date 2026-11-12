# Issue #78 — Accessible login confirmation

Date: **2026-11-12**. Branch `fix/auth-login-success`, based on freshly fetched
`origin/main` at `e35f827`. Worktree: `TU_ClubHub_CS261-issue78`. The previous task
branches and their working trees were left intact. No applicable `AGENTS.md` was
found; `COMMIT_RULES.md`, the actual authentication flow, existing component tests,
API_v1 and OpenAPI were read before editing.

## Cause and contract decision

`AuthContext.login` already awaited POST `/auth/login` followed by GET `/auth/me`.
`LoginPage` redirected as soon as the user became authenticated. Neither the auth
state nor the application root had a fresh-login notification, so no confirmation
survived that route change. The backend already returns HTTP 200 with `user` and
fresh `csrf`; `LoginResponse` has no success flag or message. That existing
contract is sufficient. Only the API documentation is clarified; no response DTO,
field, HTTP status, authentication requirement or backend runtime code changes.

The first regression run, before production edits, ran **15 tests: 10 passed,
5 failed, 0 skipped**. It demonstrated the missing confirmation/live region,
missing error handling for null/missing session users, and a stale successful
`/auth/me` response restoring auth after concurrent session invalidation. The
original five tests continued to pass. The additional acceptance cases were
then expanded to the final 22-test auth suite.

## Changes

| File | Purpose |
|---|---|
| `frontend/src/features/auth/AuthContext.tsx` | In-memory explicit-login success event, set only after the current login/session load completes; clear it on dismissal, logout, new login or authentication failure. Reject invalid session user data. Reuse the auth version to reject superseded login responses without clearing a newer login. |
| `frontend/src/features/auth/LoginSuccessNotice.tsx` | Pre-mounted polite/atomic status live region. Show the Thai confirmation outside the login route, with the existing green notification style and a native, labelled close button. No automatic reading deadline or focus steal. |
| `frontend/src/App.tsx` | Mount the notice outside the changing route tree. |
| `frontend/tests/authErrorFlow.test.ts` | Extend existing jsdom/Testing Library tests, rendering the real production App and mocking HTTP transport only. |
| `frontend/README.md` | Explain explicit login, dismissal and session restoration behavior. |
| `docs/api/API_v1.md`, `docs/api/openapi.yaml` | Record why HTTP 200 and the existing user/csrf shape suffice, and when the frontend may announce success. |

No confirmation is persisted in local/session storage, URL parameters or router
history. A remounted provider restores the user's existing session silently.
`safeRedirectPath` and the routing/security configuration remain unchanged.
The existing browser-only mock also sets the notice only for an explicit login,
not for restoration; the executed component tests use the real API-mode flow.

## Acceptance criteria and test methods

All methods below are in `frontend/tests/authErrorFlow.test.ts`.

| Criterion | Executed coverage |
|---|---|
| Success only after login and loaded session; screen reader semantics | `fresh login waits for /auth/me, preserves next query/hash and announces success after navigation`: hold `/auth/me` with a controlled promise, assert no premature message, then verify the destination, single confirmation and the same pre-mounted role=status node with aria-live=polite / aria-atomic=true. Also verifies existing CSRF and credential request shape without a status/message field. |
| Preserve intended protected page | `a visitor returns to the originally protected page and sees the confirmation there`: start at the real `/profile/applications?page=2`, go through RequireAuth + LoginPage, then return to the same path/query. |
| Preserve safe redirect defaults and route matching | `login confirmation preserves the redirect policy for ...`: absent next and external next fall back to `/`; uppercase/trailing-slash `/LOGIN/` still redirects to the intended dashboard before showing the message. |
| Login errors never announce success | `login rejection ...`: bad credentials 401, suspended account 403 and provider unavailable 503; safe error, no navigation or success, no raw server details. |
| Session-load errors never announce success | `login 200 followed by ... session load ...`: 401, 503, null user and missing user; retain the login page and show an error. |
| Transport errors | `a network failure during ...`: separate login and session-load failures, safe connectivity message and no confirmation. |
| Refresh/restoration is not a fresh login | `session restoration and a reload after a fresh login do not replay the success notice`: both initial restoration and remounting after an actual successful login show no confirmation. |
| Dismissal persists across route changes | The success test closes the notice and changes routes; it stays dismissed. |
| Logout and later login | `logout clears the previous confirmation and a subsequent explicit login can announce again`: clear on logout, then show exactly one confirmation for the next successful login. |
| Do not revive a stale session | `a session invalidated while the login session load is pending cannot announce stale success`: issue a concurrent protected-resource 401 before releasing the held successful session response; keep the user logged out, without success. Existing bootstrap/version and RBAC error tests also remain enabled. |

Tests use deterministic deferred responses and Testing Library waits, not timing
sleeps. Success tests check destination/query/hash and message contents/ARIA,
rather than only a resolved promise. Test data is fictional. Assertions and
existing tests were not removed or skipped.

## Actual verification

Node **24.19.0**, npm **11.17.0**, installed from the unchanged lockfile. CI uses
Node22; remote CI was not run as part of this local change.

| Command/check | Actual result |
|---|---|
| First auth regression run before production fix | 15 run, 10 passed, 5 failed, 0 skipped; retained before-fix evidence |
| `node --import tsx --test --test-reporter=tap tests/authErrorFlow.test.ts` | **22 passed**, 0 failed/cancelled/skipped |
| Same auth suite, three additional repetitions | **22 passed each**, 66 executions; 0 failed/cancelled/skipped |
| `npm test` from frontend | **171 passed**, 0 failed/cancelled/skipped |
| `npm run lint` | Passed |
| `npm run build` | Passed TypeScript + Vite production build |
| Redocly 1.34.5 with repository rules, both API specifications | Valid, 0 errors; 8 warnings (baseline compared separately) |
| Strict duplicate-key YAML, OpenAPI validator and references | Both specifications valid. Structural comparison proves only the login description changed; response schemas, operations, statuses and security remain identical. |
| `git diff --check` | Passed |

The temporary empty offline npm cache could not satisfy installation; normal
`npm ci` then installed the locked dependencies successfully. Redocly used the
already installed 1.34.5 binary, with the same command arguments/rules as CI.

Logs are under `/private/tmp/clubhub-issue78-`: `before.log`, `auth-tests.log`,
`auth-repeat-{1,2,3}.log`, `frontend-tests.log`, `lint.log`, `build.log`,
`openapi.log`, `openapi-baseline.log`. No credentials are required by these tests.

### Evidence limits and reviewer walkthrough

- These are executed frontend component/transport tests, not a new real-TU or
  PostgreSQL authentication verification. No backend implementation changed, so
  the backend Maven suite was not rerun for this issue.
- The DOM tests prove the live-region attributes and pre-mounted content update;
  manual VoiceOver/NVDA listening has not been performed.
- Manual review: open a protected link while logged out, log in, confirm the
  destination and green announcement, dismiss it, refresh, then repeat with bad
  credentials or an unavailable `/auth/me`. A fresh login should announce once;
  restoration and failed attempts should not.
- Local checks do not imply GitHub Actions success or reviewer approval.
- At the implementation handoff on 2026-11-12, no commit, push, issue closure
  or PR creation had been performed. The requester authorized commit, push
  and PR publication using their GitHub account on 2026-11-13.

Proposed commit: `fix(auth): show successful login confirmation`.

## Publication checks — 2026-11-13

Fresh `git fetch origin` confirmed `origin/main` remains `e35f827`; no existing
remote branch or PR for `fix/auth-login-success` was found. GitHub account and
the existing Git author identity were verified without printing credentials.
Before committing, the following checks were rerun on the final source:

- `npm test`: **171 passed**, 0 failures/cancelled/skipped.
- `npm run lint`: passed.
- `npm run build`: passed TypeScript and Vite.
- Redocly 1.34.5: both specifications valid, 0 errors, 8 baseline warnings.
- `git diff --check`: passed.

Logs: `/private/tmp/clubhub-issue78-publish-{tests,lint,build,openapi}.log`.
These are local results; the PR records GitHub Actions status separately.
