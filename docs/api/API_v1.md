# TU-ClubHub API Contract

| Property | Value |
|---|---|
| Version | `v1` |
| Contract status | Partially implemented; Sprint 2 contracts specified in `openapi.yaml` (v1.2.0), `rounds.openapi.yaml` (v1.1.0), and `task75-sprint2-design.md` |
| Last updated | 2026-10-28 |
| Audience | Frontend and backend developers |

This document defines the shared HTTP contract for the TU-ClubHub foundation and application submission. It is based on the [scaffold context](../architecture/scaffold-context.md) and [system architecture](../architecture/system-architecture.md). The contract describes the intended behavior and remains the target even where the current implementation is incomplete.

Authorization policy was adopted on 2026-10-19 in the [Permission Matrix](../security/permission-matrix.md). Its Active, term, self-review, and Admin rules are decided; the matrix separately records implementation gaps. Adoption does not imply that future product endpoints exist.

**Task74 decision update, 2026-10-27:** product decisions below are recorded from the user's instruction and are **Pending Team Review**; they do not constitute a completed PO/Reviewer sign-off or a runtime deployment. In particular, the private-resource error policy changes from hiding an existing unauthorized application with `404` to returning `403 ACCESS_DENIED`; nonexistent resources use `404 RESOURCE_NOT_FOUND`. See [§8.1](#81-task74-sprint-2-contract-handoff--draft--pending-review), [§9](#9-compatibility-and-change-policy), and the [decision log](../architecture/system-architecture.md#s2-decision-log).

The machine-readable OpenAPI 3.1 document is [`docs/api/openapi.yaml`](openapi.yaml). Recruitment management uses the separate OpenAPI 3.0.3 document [rounds.openapi.yaml](rounds.openapi.yaml). Keep both aligned with their contracts and frontend DTOs.

### Implementation status

Reviewed from source on 2026-10-19; this table records handlers and integration, not test results or complete policy enforcement.

| API | Backend status | Frontend status |
|---|---|---|
| Auth endpoints under `/api/v1/auth`: `csrf`, `login`, `me`, `logout` | Implemented with TU adapters, JDBC session, CSRF, and absolute timeout | Login/account/logout connected |
| `GET /api/v1/public/clubs/{id}` and `.../{id}/recruitment-rounds` | Implemented; active clubs and currently open rounds from DB | Club detail still uses mock data and is not mounted |
| `GET /api/v1/clubs/{clubId}` | Contract-only; no handler | Editor client calls this missing endpoint |
| `PUT /api/v1/clubs/{clubId}` | Implemented with the current committee guard | Editor/client exist but are not mounted |
| Round `POST`/`PUT`, `PATCH PUBLISH`/`CLOSE` | Implemented; see rounds contract | Forms still need integration |
| Committee round `GET` list/detail and `PATCH CANCEL` | Pending; cancellation reason still needs a schema | Pending |
| `GET /api/v1/rounds/{roundId}/application-form` (§12) | Account/student/window policy confirmed by Task42 requester; PO/team review pending; no handler | Form prototype only |
| `POST /api/v1/rounds/{roundId}/applications` (§11) | Contract defined; no handler/service yet | No submission client |
| `/actuator/health` | Implemented | Operational endpoint |

The [permission matrix](../security/permission-matrix.md#9-สถานะ-implementation-และงานที่ต้องตามนโยบาย) lists remaining Active, PRESIDENT, account-refresh, and self-review checks. Login-time student-profile provisioning/synchronization exists in [UserAccountService](../../backend/src/main/java/com/tu/clubhub/user/service/UserAccountService.java); real TU access and verification of upstream student-status mapping remain integration work. Login does not create memberships, assignments, or privileged roles.

## 1. Contract scope

The foundation contract covers:

- Session-based authentication through the TU Authentication API.
- CSRF token bootstrap for browser requests.
- The current user's minimal account identity.
- Public club profiles and currently open recruitment rounds for active clubs.
- Application submission with answers and document links, including database persistence, as defined in [section 11](#11-application-submission).
- Applicant-facing form schemas and the read policy in [section 12](#12-round-application-form-task42).
- A minimal health endpoint for operations.

Application review, membership decisions, notifications, search, and dashboards remain product backlog work; their request and response schemas must be defined before implementation. Recruitment management is specified separately in [rounds.openapi.yaml](rounds.openapi.yaml). The submission contract is defined below, but its implementation is still pending. A not-yet-implemented endpoint must not return a success response as a stub.

## 2. API conventions

| Concern | Contract |
|---|---|
| Base path | `/api/v1` |
| Transport | HTTPS in deployed environments; same-origin browser requests |
| Request/response format | JSON (`application/json`); `/api/v1` errors use `application/problem+json` |
| JSON field names | `camelCase` |
| IDs | Decimal strings for database `bigint` IDs, to preserve precision in JavaScript |
| Timestamps | ISO 8601 UTC strings, for example `2026-10-11T09:30:00Z` |
| Success bodies | Return the resource DTO directly; collection endpoints use a documented collection wrapper |
| Unknown response fields | Clients should ignore fields they do not recognize |
| Database entities | Never serialize persistence entities directly |

The browser uses relative URLs and sends the session cookie with requests. It must not call the TU Authentication API directly, store credentials or session IDs in browser storage, or treat frontend role state as authorization. The backend checks authentication and resource permissions on every protected request.

### Collection convention

Collection APIs must be paginated. Unless a feature needs a different documented strategy, use zero-based `page` and `size` query parameters, default `page=0`, default `size=20`, and maximum `size=100`. Apply authorization and filters before pagination and before calculating totals.

```json
{
  "items": [],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

Only return sort fields explicitly supported by the endpoint. The public recruitment-round endpoint uses this collection wrapper.

## 3. Authentication, session, and CSRF

Authentication uses a server-side Spring Session JDBC session. The browser receives an `HttpOnly` session cookie; authentication details and TU credentials are not returned in JSON. Use `Secure` on HTTPS, `SameSite=Lax` by default, `Path=/`, and a host-only cookie. Secure cookies may be disabled only for local HTTP development and tests. The cookie name is `SESSION` for this contract.

The server expires an authenticated session after 30 minutes without activity or 8 hours after successful login, whichever comes first. The idle timeout resets with session activity; the absolute timeout does not. Enforce both limits server-side. An expired session returns `401 AUTHENTICATION_REQUIRED`; the frontend clears its auth state and gets a fresh CSRF token before the user logs in again.

All state-changing requests, including login and logout, require a valid CSRF token. `GET` requests do not require a CSRF header. This contract fixes the header name to `X-CSRF-TOKEN`; the token endpoint also returns the name so clients can use the server-provided value.

### Browser flow

1. Call `GET /api/v1/auth/csrf`; retain the returned CSRF token in memory and allow the browser to retain the session cookie.
2. Call `POST /api/v1/auth/login` with credentials and the returned CSRF header.
3. After successful login, the backend rotates the session ID and returns a fresh CSRF token in the login response body. Replace the in-memory token before making another state-changing request; no extra CSRF request is needed after login.
4. Call `GET /api/v1/auth/me` to initialize or restore the frontend auth state.
5. Before logout, send the current CSRF token to `POST /api/v1/auth/logout`. Clear frontend auth state and fetch a fresh CSRF token before a later login.

The frontend must not read, copy, or persist the session cookie. The backend must establish and save the authenticated Spring Security context in the JDBC session so that a subsequent request using that cookie is authenticated.

### `GET /api/v1/auth/csrf`

Creates or uses the browser session and returns the CSRF token for that session. It is public and must return `Cache-Control: no-store`.

**`200 OK`**

```json
{
  "headerName": "X-CSRF-TOKEN",
  "token": "opaque-token-value"
}
```

The token is opaque. Clients must not parse it or derive a token from the session cookie.

### `POST /api/v1/auth/login`

Verifies credentials through the configured TU adapter, creates or updates the local account after successful verification, rotates the session ID, and establishes the authenticated session. The adapter maps this endpoint's `username` and `password` to the TU Authentication API's documented `UserName` and `PassWord` JSON fields, sends the `Application-Key` header, and reads the documented identity response. See the [TU Authentication API documentation](https://restapi.tu.ac.th/home/documents/Authen.html). The full channel-specific endpoint URL and Application-Key are supplied through environment configuration and are never committed.

Local and CI runs use the fixed-account mock adapter. They do not call the TU service. Real mode requires `TU_AUTH_ENDPOINT_URL` and `TU_AUTH_APPLICATION_KEY`; if they are missing, application startup fails instead of falling back to mock authentication.
With the `dev` or `test` profile, the fixed demo credentials are `student-demo` / `tu-clubhub-demo`.

**Request** (`application/json`; CSRF header required)

```json
{
  "username": "student-id-or-account-name",
  "password": "user-entered-password"
}
```

**`200 OK`** — sets the rotated session cookie, returns `Cache-Control: no-store`, and includes a fresh CSRF token for the authenticated session. It contains no credential or session identifier.

```json
{
  "user": {
    "id": "10001",
    "role": "USER"
  },
  "csrf": {
    "headerName": "X-CSRF-TOKEN",
    "token": "opaque-token-value"
  }
}
```

The `username` field is the TU account identifier entered by the user. The backend adapter maps it to the official TU API request format. The password must not be logged, stored, returned, or copied into the session.

After TU verification succeeds, the backend creates a local `users` row on first login, keyed by the unique TU username. Later successful logins refresh the display name, email, and `last_login_at`; they preserve the local `system_role` and `account_status`. New accounts start as `USER` and `ACTIVE`. A suspended account is rejected after identity verification. Login never creates a `student_profiles` row because TU authentication currently does not provide an agreed, normalized student eligibility status.

### `GET /api/v1/auth/me`

Returns the authenticated user's minimal account identity. It returns `401 AUTHENTICATION_REQUIRED` when no authenticated session exists or its idle/absolute lifetime has expired. Under the adopted policy, a currently suspended account returns `403 ACCOUNT_NOT_ALLOWED` and its session is invalidated. Read the current global role from the database. The response is a UI hint only; the backend still performs authorization for each operation. Committee privileges are assignments scoped to a club and term, not a global user role. The permission matrix records the remaining account/role revalidation work.

**`200 OK`** with `Cache-Control: no-store`.

```json
{
  "user": {
    "id": "10001",
    "role": "USER"
  }
}
```

`role` is `USER` or `ADMIN`. Student eligibility is defined by the permission matrix, but normalized TU student status is not included in this response until its integration and response contract are implemented. Do not infer student or committee access from `role`.

### `POST /api/v1/auth/logout`

Invalidates the current server-side session and clears the session cookie. Requires the current CSRF token. Returns `204 No Content` with `Cache-Control: no-store` after successful invalidation; the response has no JSON body.

### Authentication errors

| Status | Code | Meaning |
|---|---|---|
| `401` | `AUTHENTICATION_FAILED` | Credentials could not be verified; message must not disclose whether an account exists |
| `403` | `ACCOUNT_NOT_ALLOWED` | Identity was verified but the account is not allowed to use TU-ClubHub |
| `403` | `CSRF_INVALID` | CSRF token is missing, expired, or invalid |
| `503` | `AUTH_PROVIDER_UNAVAILABLE` | TU Authentication API could not be reached or returned an unusable response |

An upstream timeout or outage must never result in a successful login or an automatic switch to the mock adapter. Mock authentication is restricted to explicit local/test configuration; enabling it in production must prevent application startup.

## 4. Club profile

### Public club API

The following read-only endpoints are public and do not require a session cookie or CSRF token. Both return data only for a club whose `clubs.status` is `ACTIVE`. An unknown or inactive club returns the same `404 CLUB_NOT_FOUND` response to avoid disclosing whether an inactive club exists. The `id` path parameter is a decimal string for a positive signed 64-bit database `bigint`, matching the project's wire convention. Non-decimal values and values outside the supported integer range return `400 INVALID_RESOURCE_ID`.

#### `GET /api/v1/public/clubs/{id}`

Returns the public club profile directly as JSON (`PublicClubProfile`). It includes the profile fields already defined by the club API contract, a category summary, and tag summaries. Nullable profile values are present as `null` when unset. It does not include the club's database status, creator, timestamps, version, committee assignments, or internal notes.

```json
{
  "id": "20001",
  "name": "Example Club",
  "description": "A student club at Thammasat University.",
  "objectives": "Help students learn and collaborate.",
  "contactUrl": "https://example.org/contact",
  "facebookUrl": null,
  "instagramUrl": null,
  "contactEmail": "club@example.org",
  "affiliationLevel": "University",
  "affiliationName": "Thammasat University",
  "imageUrl": "https://images.example.org/clubs/20001.png",
  "bannerUrl": null,
  "category": { "id": "30001", "name": "Technology" },
  "tags": [{ "id": "40001", "name": "Programming" }]
}
```

#### `GET /api/v1/public/clubs/{id}/recruitment-rounds`

Returns a paginated `items`/`page` collection of public recruitment round summaries. It includes a round only when `publication_status = 'PUBLISHED'`, `opens_at <= evaluation instant < closes_at`, and `closed_at IS NULL`. The opening instant is inclusive; the scheduled closing instant is exclusive. This uses the open-window rule recorded in the ERD. An active club with no qualifying rounds returns `200 OK` with an empty `items` array and zero totals:

```json
{
  "items": [],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

For non-empty pages, each item contains only `id`, `name`, `opensAt`, and `closesAt`. `name` is the public display name for the round (mapped from `recruitment_rounds.title`). The contract uses the standard zero-based `page` and `size` parameters (default `0` and `20`, maximum size `100`). Timestamps are `TIMESTAMPTZ` instants serialized as ISO 8601 UTC values ending in `Z`. The implementation samples one backend `Clock.instant()` for both the page query and count. Deployment must keep host clocks synchronized; no clock-skew allowance is defined.

Both endpoints use the shared `application/problem+json` `Problem` error format for `400 INVALID_RESOURCE_ID`, `404 CLUB_NOT_FOUND`, `405 METHOD_NOT_ALLOWED`, `503 SERVICE_UNAVAILABLE`, and unexpected `500 INTERNAL_ERROR`. Neither endpoint returns `401` or `403` because both are public reads.

### `GET /api/v1/clubs/{clubId}`

**Contract-only; no backend handler.** The editor client currently calls this path. The implemented public read APIs are the two `/api/v1/public/clubs/...` endpoints above; they have different response DTOs.

Returns a public club profile without requiring login. `clubId` is a decimal string ID. The response may include only published recruitment rounds and public profile fields; it must not expose draft rounds, applicant data, committee-only information, or internal notes. The backend does not fetch images or documents from URLs. The response includes the public profile columns from `clubs`, the category, tags, and published recruitment rounds. Database `bigint` IDs are decimal strings on the wire.

**`200 OK`** (target DTO for the pending endpoint)

```json
{
  "id": "20001",
  "categoryId": "30001",
  "name": "Example Club",
  "description": "A student club at Thammasat University.",
  "objectives": "Help students learn and collaborate.",
  "contactUrl": "https://example.org/contact",
  "facebookUrl": null,
  "instagramUrl": null,
  "contactEmail": "club@example.org",
  "affiliationLevel": "University",
  "affiliationName": "Thammasat University",
  "imageUrl": "https://images.example.org/clubs/20001.png",
  "bannerUrl": null,
  "status": "ACTIVE",
  "category": {
    "id": "30001",
    "name": "Technology"
  },
  "tags": [
    {
      "id": "40001",
      "name": "Programming"
    }
  ],
  "recruitmentRounds": [
    {
      "id": "50001",
      "name": "Academic Year 2026",
      "opensAt": "2026-10-01T00:00:00Z",
      "closesAt": "2026-10-31T16:59:59Z",
      "closedAt": null
    }
  ]
}
```

`objectives`, contact/social URLs, email, affiliation, image, and banner values may be `null` when not set. `imageUrl` may be `null`; the frontend displays its bundled default image in that case. Contact, social, image, and banner URLs, when present, must use HTTPS. The backend returns URLs as data and does not download or preview the remote resource. `recruitmentRounds` contains published rounds only. `status` is `ACTIVE` for public profiles; inactive clubs are not returned by this public endpoint.

| Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_RESOURCE_ID` | `clubId` is not a valid decimal ID |
| `404` | `CLUB_NOT_FOUND` | No public club exists for this ID |
| `405` | `METHOD_NOT_ALLOWED` | The club path does not support the requested method; only `GET` and `PUT` are defined |
| `503` | `SERVICE_UNAVAILABLE` | The database dependency is unavailable |

IDs containing non-decimal characters or a minus sign return `400 INVALID_RESOURCE_ID`. An empty ID is not a path value; `/api/v1/clubs/` is an unmatched route and returns `404`.

### `PUT /api/v1/clubs/{clubId}`

Replaces the editable profile fields for a club and returns the updated public profile. Requires an authenticated session, the current CSRF header, and an effective `COMMITTEE` or `PRESIDENT` assignment for this club. Under the adopted permission matrix, account, student profile, club, membership, and assignment must be `ACTIVE`; membership must have `joined_at <= now` and `ended_at IS NULL`; assignment must have `revoked_at IS NULL` and `starts_at <= now < ends_at`. The server rechecks current database state on every request and inside the write transaction. `ADMIN` alone grants no access. A missing or expired session returns `401`; a suspended account returns `403 ACCOUNT_NOT_ALLOWED`; other permission failures return `403 ACCESS_DENIED`. The matrix records the guard additions still required in the implementation.

The caller may update only `name`, `description`, `objectives`, `contactUrl`, `facebookUrl`, `instagramUrl`, `contactEmail`, `imageUrl`, and `bannerUrl`. Category, affiliation, status, IDs, tags, and recruitment rounds are not writable through this endpoint. `name` and `description` are required and non-blank; `name` is limited to 200 characters. Nullable fields omitted or sent as `null` are cleared. URL fields, when provided, must be HTTPS URLs; `contactEmail`, when provided, must be a valid email address. Text is treated as data, not executable HTML; persistence queries must use bound parameters, and clients must escape text when rendering it.

**Request body** (`ClubUpdateRequestDto`):

```json
{
  "name": "TU Coding Club Updated",
  "description": "A club for programming enthusiasts.",
  "objectives": "Learn and share coding skills.",
  "contactUrl": "https://example.org/contact",
  "facebookUrl": null,
  "instagramUrl": "https://instagram.com/tucoding",
  "contactEmail": "tucoding@example.org",
  "imageUrl": "https://images.example.org/clubs/20001.png",
  "bannerUrl": null
}
```

**`200 OK`** returns the updated `ClubResponseDto` public profile using the same shape as `GET /api/v1/clubs/{clubId}`. Errors use the shared `application/problem+json` format and stable codes:

| Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_RESOURCE_ID`, `VALIDATION_FAILED` | Invalid `clubId` or request fields; field details are in `fieldErrors` |
| `401` | `AUTHENTICATION_REQUIRED` | No authenticated session or session expired |
| `403` | `ACCESS_DENIED`, `ACCOUNT_NOT_ALLOWED`, `CSRF_INVALID` | Active/term/committee requirements fail, the account is suspended, or CSRF validation failed |
| `404` | `CLUB_NOT_FOUND` | No club exists for this ID |
| `405` | `METHOD_NOT_ALLOWED` | The club path does not support the requested method; only `GET` and `PUT` are defined |
| `503` | `SERVICE_UNAVAILABLE` | The database dependency is unavailable |

For `VALIDATION_FAILED`, each entry in `fieldErrors` identifies a request field using the shared `field`, `code`, and `message` shape. Do not return database constraint errors or internal details to the client.

## 5. Health endpoint

### `GET /actuator/health`

Returns the minimum operational health status needed by local tooling and the hosting platform. It is public and requires no session. It is not part of `/api/v1` and must not expose environment variables, secrets, database connection details, or internal diagnostics. Expected responses are `200` when healthy and a non-2xx status when unhealthy, in the framework's configured health format.

## 6. Error contract

All `/api/v1` errors use `Content-Type: application/problem+json`. The response follows Problem Details and adds stable machine-readable `code`, optional `fieldErrors`, and a server-generated `traceId`. The health endpoint retains its configured Actuator response format. Do not expose stack traces, SQL, credentials, session identifiers, or sensitive upstream response bodies.

```json
{
  "type": "urn:tuclubhub:problem:validation-error",
  "title": "Request validation failed",
  "status": 400,
  "detail": "One or more request fields are invalid.",
  "instance": "/api/v1/auth/login",
  "code": "VALIDATION_FAILED",
  "fieldErrors": [
    {
      "field": "username",
      "code": "REQUIRED",
      "message": "Username is required."
    }
  ],
  "traceId": "01J9EXAMPLE7K4D5"
}
```

`fieldErrors` is omitted when an error is not associated with request fields. Endpoints may define a `reason` extension to distinguish conflicts under the shared `RESOURCE_CONFLICT` code. Clients should branch on `status`, `code`, and documented `reason` values, not on localized human-readable messages.

| Status | Typical code | Use |
|---|---|---|
| `400` | `VALIDATION_FAILED`, `INVALID_RESOURCE_ID` | Malformed JSON, invalid parameter, or field validation failure |
| `401` | `AUTHENTICATION_REQUIRED`, `AUTHENTICATION_FAILED` | Missing/invalid authentication or rejected login credentials |
| `403` | `ACCESS_DENIED`, `CSRF_INVALID`, `ACCOUNT_NOT_ALLOWED` | Authenticated user lacks permission to an existing private resource, another access rule fails, CSRF check fails, or account is not allowed |
| `404` | `RESOURCE_NOT_FOUND`, `CLUB_NOT_FOUND` | Resource does not exist; public/availability visibility exceptions remain explicitly documented per endpoint |
| `405` | `METHOD_NOT_ALLOWED` | The path exists but does not support the request method |
| `409` | `RESOURCE_CONFLICT` | Duplicate request or invalid current-state transition |
| `429` | `RATE_LIMITED` | Request rate limit exceeded; include `Retry-After` when known |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |
| `503` | `SERVICE_UNAVAILABLE`, `AUTH_PROVIDER_UNAVAILABLE` | A required dependency such as the database or TU Authentication API is unavailable |

The table is the shared error vocabulary. An endpoint's OpenAPI operation lists the errors relevant to it. If rate limiting is introduced, its actual thresholds and retry policy must be documented before release; no numeric rate limit is set by this contract.

## 7. Authorization rules

The [Permission Matrix](../security/permission-matrix.md) is authoritative. The following rules combine the adopted 2026-10-19 baseline with the explicitly marked user decisions recorded on 2026-10-27 (Pending Team Review), including for product APIs that are not implemented yet:

- Public reads require no login and expose only active clubs and recruitment information allowed by the public endpoint.
- All protected operations require a valid session and an `ACTIVE` account checked against current database state. On detecting suspension, return `403 ACCOUNT_NOT_ALLOWED` and invalidate the session. Public access and session cleanup remain available; unsafe requests still require CSRF.
- Student eligibility requires a verified `student_profiles.student_status = 'ACTIVE'`. Successful TU login alone does not establish eligibility. Missing or unverified status grants no student or committee privileges.
- Committee access requires an active account, student profile, club, membership, and assignment for the actual resource's club. Membership must have started and not ended; assignment must be unrevoked with `starts_at <= now < ends_at`. The start is inclusive and the end exclusive, using backend UTC time. Recheck inside write transactions; no scheduled expiry job or client refresh is needed to remove expired privileges.
- The global role remains `USER` or `ADMIN`; `COMMITTEE`/`PRESIDENT` are club assignment roles. Admin has no term of its own, but acting as committee requires the same effective assignment as anyone else.
- Applicants may access only their own applications. An active account may read its existing private records even when student or club status is inactive. Hide unpublished results and internal review notes. Under the user's 2026-10-27 decision T74-D01, access to an existing unauthorized private application/resource returns `403 ACCESS_DENIED`; a nonexistent resource returns `404 RESOURCE_NOT_FOUND`. Do not retain the former other-owner `404` hiding policy. This changes the target contract, not the current runtime; public inactive-club and form/submission availability responses remain the explicit endpoint rules below.
- A fresh confirmation requires active student and club status, ownership, a published accepted result in a non-cancelled round, and `results_published_at <= serverNow < confirmation_deadline`. A fresh decline requires active account, ownership, the same result/deadline conditions, but does not require student or club Active status. Recheck current write permissions and state in the transaction, then sample server time after the relevant lock/recheck before writing; frontend time never decides eligibility.
- Under the user's T74-D05 decision, an authenticated, Active owner repeating the same already-recorded final action receives that stored outcome without another decision, membership write or history row. This retry is an authorized read of the existing outcome, so do not impose the fresh-action deadline or create a new response time; recheck current session/account/ownership. An opposite final action is `409 RESOURCE_CONFLICT`, with no change of mind in MVP. Response DTOs remain to be designed; never replay a raw entity or restore a later-changed membership. This rule does not change submission's duplicate `409`.
- Under the user's final T74-D07 decision, a fresh confirmation is rejected unchanged if any membership row already exists for the applicant and target club, whether `ACTIVE`, `INACTIVE`, `LEFT` or `REMOVED`. The exception is the exact same-application final-action retry above, which only reads its stored outcome. MVP has no reactivation/rejoin through a new confirmation; preserve the existing membership row, source and history. This confirmation rule does not expand the already-defined submission/form checks.
- A user who has an application in a round, in any status, cannot use committee permissions for that round. This includes internal reads, round changes, decisions, cancellation, and publication; withdrawing an application does not lift the restriction. Filter such rounds before committee pagination/counts.
- COMMITTEE/PRESIDENT may record internal decisions after recruitment closes and before publication. Only an effective PRESIDENT without an application in that round may publish results or cancel a round, subject to the state/time rules in the matrix. Editing published results and accepting/declining on behalf of others are denied.
- Admin may access aggregate university statistics and manage committee appointments and limited initial membership provisioning. Admin cannot appoint itself, read application content through its global role, or override Active, terms, ownership, self-review, or published decisions. The app does not grant global-role/account-status/club-status management permissions in this scope.
- The backend verifies resource-parent relationships and current permissions; it does not trust hidden buttons, cached roles, or client-provided ownership/status values. Missing permissions, expired terms, inactive eligibility, and self-review use `403 ACCESS_DENIED`; valid authorization followed by a state/deadline/version conflict uses `409 RESOURCE_CONFLICT`. CSRF rejection may precede these checks.

Recruitment management contracts are in [rounds.openapi.yaml](rounds.openapi.yaml), and application submission is defined in [section 11](#11-application-submission). Application reads/review, publication, dashboard, and assignment-management endpoints still require their own contracts and implementation.

## 8. Remaining product contracts and integration

The table includes new APIs and unfinished parts of existing contracts. Define missing paths, DTOs, status codes, permissions, and examples before implementation; preserve the contracts already agreed:

| Story | Resource area | Decisions needed |
|---|---|---|
| US-01 | Club search and filters | Search/filter fields, sort options, and category/tag semantics |
| US-04 | Applicant application list/detail/history | Owner-only access and hiding unpublished results/internal notes are decided; section 11 reserves `GET /api/v1/me/applications` and `GET /api/v1/me/applications/{applicationId}`; define response/status mapping |
| US-05 | Confirm or decline an offer | User decisions record retry, opposite-action conflict, transaction-time checks and rejection of all prior target membership rows for fresh confirmation; define operation/DTOs and implement publication/atomicity/concurrency |
| US-06 | Club profile editing extensions | Pending GET integration, category/tag writes, and concurrent update policy; PUT already exists |
| US-07 | Recruitment management completion | GET list/detail and CANCEL from rounds.openapi.yaml remain pending; define cancellation reason and complete permission checks |
| US-08 | Recruitment question integration | Round POST/PUT and per-question list/create/update/delete/reorder APIs exist, and the question-management page uses them; current policy permits changes only on drafts without applications; define any future question versioning separately |
| US-09 | Committee application review | Scope, privacy boundaries, and self-review are decided in the matrix; current story remains read-only; decision/publication need separate implementation work |
| Selection-results Draft | Explicit review action, internal decisions and result publication | See [selection-results-draft.md](../stories/sprint2/selection-results-draft.md); the user confirmed ชนิตว์นันท์ as Owner of the two Draft Stories. FE/BE owners remain to be assigned; temporary IDs, team review, operation paths/DTOs/audit design and handlers remain pending |
| US-10 | Central dashboard | Admin aggregate access is decided; define metrics and academic-period attribution |
| Backlog | Committee appointment administration | Admin-only authorization is decided; define appointment/revocation/bootstrap APIs and audit storage |
| Backlog | In-app notifications | Event triggers, read/unread behavior, and ownership |

US-03 submission is now specified in [section 11](#11-application-submission); login-time student-profile synchronization exists, while verification against real TU responses and submission endpoint implementation remain required. Application status values referenced by the architecture are `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`, `WITHDRAWN`, and `EXPIRED`. Submission creates `SUBMITTED`, displayed as Pending; enum presence does not approve every action for Sprint 2. The user's T74-D02 decision excludes `INTERVIEW` from MVP and makes `UNDER_REVIEW` optional through an explicit action only; US-09 reads never change state. Direct `SUBMITTED → ACCEPTED/REJECTED` is allowed after actual recruitment close under the existing committee/state rules. `WITHDRAWN` action support still needs explicit scope. `EXPIRED` denotes automatic timeout, displayed as “สละสิทธิ์ (หมดเวลาตอบรับ)”, and remains distinct from voluntary `DECLINED`. Do not publish internal decisions or revealing history/messages/notifications before actual `resultsPublishedAt`; internal review notes remain private after publication.

### 8.1 Task74 Sprint 2 contract handoff — Draft / Pending Review

Prepared on 2026-10-27 from repository evidence and updated with the user's product decisions on the same date. Those instructions are recorded decisions, **Pending Team Review**, rather than a claim that formal PO/Reviewer sign-off or implementation occurred. The [Task74 review artefact](../architecture/task74-sprint2-analysis.md) links the [application state machine](../architecture/system-architecture.md#s2-application-state-machine), [business-rule index](../architecture/system-architecture.md#s2-business-rules), [permission matrix](../security/permission-matrix.md#s2-permission-matrix), and [decision log](../architecture/system-architecture.md#s2-decision-log). Keep rules in those canonical locations; this section records contract dependencies only.

| Contract/design area | Existing baseline and remaining work | Decision dependency |
|---|---|---|
| Applicant list/detail/history — US-04 | §11 reserves the `/me/applications` collection/detail URIs, but response/history DTOs and handlers are missing. T74-D01 records the user's decision: an existing unauthorized private resource uses `403 ACCESS_DENIED`; nonexistent uses `404 RESOURCE_NOT_FOUND`. This supersedes the former other-owner `404` policy. Define pre/post-publication status mapping and a field/history allowlist. Reads never set `UNDER_REVIEW`. | T74-D01 recorded / Pending Team Review; T74-D04 open |
| Committee list/detail — US-09 | Read-only; paths/DTOs still need design. Use the actual round/club, current assignment/term and all-status self-review restrictions before pagination/count. Existing unauthorized private resources use `403`, missing resources `404`. Opening an application does not record a decision or change state; optional `UNDER_REVIEW` requires a separate explicit action. | T74-D01/02 recorded / Pending Team Review; T74-D04 open |
| Internal decision and result publication | The user confirmed ชนิตว์นันท์ as Owner of the two [Draft Stories/AC](../stories/sprint2/selection-results-draft.md); FE/BE assignment, team review, API contracts and handlers remain pending. Do not absorb writes into US-09. COMMITTEE/PRESIDENT may decide directly from SUBMITTED, or from optional UNDER_REVIEW, after actual close; MVP excludes INTERVIEW. PRESIDENT alone publishes under the existing matrix. Recruitment `PUBLISH` is not selection-result publication. Publication changes round metadata, not application status; design its audit rather than faking `ACCEPTED → ACCEPTED` history. | T74-D02 and D03 Owner recorded; team review, T74-D03 audit and T74-D04 visibility remain open |
| Confirm/decline — US-05 | No complete operation/response DTO or handler. Fresh actions use actual publication and transaction-time checks; exact same-final-action retry returns the stored outcome after session/account/ownership checks with no new writes. Opposite final action is `409`, no change of mind. Fresh confirmation rejects any prior target membership row (`ACTIVE`/`INACTIVE`/`LEFT`/`REMOVED`) unchanged; no MVP reactivation. Same-application final-action retry only reads its stored outcome. Recheck the existing five-club ceiling with cross-club serialization for eligible fresh confirmation. | T74-D05/07 and timing part of D06 recorded / Pending Team Review; implementation/DTO/lock design pending |
| Expiry processing — US-05 | Automatic expiry is recorded scope, not a public endpoint. At/after deadline, only unanswered, published accepted applications become `EXPIRED`; preserve decisions and final outcomes, with `responded_at`/system actor as in Schema. Sweep/catch-up mechanism, frequency and acceptable lag still need team Design. Request APIs enforce the deadline even if the worker is late. | T74-D06 timing/automatic expiry recorded; worker scheduling/lag open |
| Dashboard — US-10 | Aggregate ADMIN-only contract/handler missing. `recruitment_rounds` already has `academic_year` and `semester`; define units, cohort/current-member meaning, multi-round aggregation and joins without double-counting. Global ADMIN grants no private applicant-content access. | T74-D08 |
| Carry-over submission/form — US-03 / Task42 | Existing POST and form GET remain pending implementation. US-03 originates in Sprint 1; confirm carry-over metadata. Keep the requester-confirmed form-read policy pending PO/team review and leave duplicate/member/quota conflicts on POST unless that policy is explicitly changed. No new form version/ETag gate is implied. | T74-D09 |

Actual result publication, not `resultsScheduledAt`, controls applicant visibility and the start of the response window. Internal decisions must not leak through errors or notifications. Appointment/revocation is a dependency when no eligible committee member/PRESIDENT is available; its existing policy does not add appointment administration to Sprint 2. Endpoint paths, payloads, new statuses, job timing and approval records for unresolved work are not created by this handoff.

**Fresh action versus retry:** for a new confirmation/decline, acquire the relevant transaction protection, recheck current write rights/state/version, then sample backend time before writing and require `results_published_at <= serverNow < confirmation_deadline`. The same-final-action retry is not a new decision: after current session/Active account and ownership/resource authorization, return the recorded outcome without another deadline decision, `responded_at` update, member change or history row. If membership later changes for another reason, this replay does not restore it. Response encoding and the precise lock strategy still need API/BE Design; a lock on one application or its uniqueness constraint alone does not serialize the user's confirmations across clubs.

Calling that replay a logical read does not define a new GET endpoint or waive CSRF for an unsafe request. The shared session, CSRF and current-account rules and their error codes still apply before returning a stored outcome.

### 8.2 Task75 Sprint 2 System & API Design Specification (2026-10-28)

Following the Task74 System Analysis handoff, the complete Sprint 2 technical contracts, OpenAPI schemas, RFC 7807 `409 RESOURCE_CONFLICT` `reason` vocabulary, database locking & expiry worker design, and frontend UI wireframes/status mappings are specified in:

- **Master System Design Document:** [`docs/architecture/task75-sprint2-design.md`](../architecture/task75-sprint2-design.md)
- **Primary OpenAPI 3.1 Specification (`v1.2.0`):** [`docs/api/openapi.yaml`](openapi.yaml)
- **Recruitment Rounds OpenAPI 3.0.3 Specification (`v1.1.0`):** [`docs/api/rounds.openapi.yaml`](rounds.openapi.yaml)

| Sprint 2 Feature / Task | Specified Endpoint(s) | Primary OpenAPI Schema(s) |
|---|---|---|
| **US-01 / Task62–63** Public Club Directory & Filters | `GET /api/v1/public/clubs`, `GET /api/v1/public/club-categories`, `GET /api/v1/public/interest-tags` | `PublicClubSearchPage`, `PublicClubSummary`, `PublicClubCategoryList`, `PublicClubTagList` |
| **Task79** Real-Time Auth Session Refresh | `GET /api/v1/auth/me` | `CurrentUser` (`studentStatus`, `activeCommitteeAssignments`) |
| **Task81** Club Profile Edit Capability Flag | `GET /api/v1/public/clubs/{id}`, `GET /api/v1/clubs/{clubId}` | `PublicClubProfile.canEditProfile`, `ClubDetail.canEditProfile` |
| **US-08 / Task51** Question Edit/Delete Conflict | `PUT / DELETE /api/v1/rounds/{roundId}/questions/{questionId}` | `Problem` (`409 RESOURCE_CONFLICT`, `reason: QUESTION_HAS_ANSWERS`) |
| **US-09 / Task65–66** Committee Application Review (Read-Only + Optional Start Review) | `GET /api/v1/rounds/{roundId}/applications`, `GET /api/v1/rounds/{roundId}/applications/{applicationId}`, `POST /api/v1/rounds/{roundId}/applications/{applicationId}/start-review` | `CommitteeApplicationPage`, `CommitteeApplicationDetail`, `StartApplicationReviewRequest` |
| **S2-DECISION-DRAFT / Task67–68** Pre-Publication Review & Decision | `PUT /api/v1/rounds/{roundId}/applications/{applicationId}/decision` | `ApplicationDecisionRequest`, `CommitteeApplicationDetail`, `ApplicationDecisionConflict` |
| **S2-PUBLICATION-DRAFT / Task67–68** Batch Result Publication | `POST /api/v1/rounds/{roundId}/publish-results` | `PublishResultsRequest`, `PublishResultsResponse`, `PublishResultsConflict` |
| **US-04 / Task64 & Task56** Applicant Application Tracking & Detail | `GET /api/v1/me/applications`, `GET /api/v1/me/applications/{applicationId}` | `ApplicantApplicationPage`, `ApplicantApplicationDetail`, `ApplicantVisibleStatus` |
| **US-05 / Task69–70** Membership Offer Confirm / Decline | `POST /api/v1/me/applications/{applicationId}/confirm`, `POST /api/v1/me/applications/{applicationId}/decline` | `MembershipOfferResponse`, `MembershipOfferConflict` |
| **US-10 / Task71–72** Admin Central Dashboard Statistics | `GET /api/v1/admin/dashboard/stats` | `AdminDashboardStatsResponse`, `AdminDashboardSummaryMetrics`, `AdminClubStatsPage` |

## 9. Compatibility and change policy

The path prefix `/api/v1` is the major API version. Adding optional response fields or new endpoints is additive. Removing/renaming fields, changing types, changing authentication, or changing established status/error behavior is breaking and requires a migration plan and a new major version.

The 2026-10-27 user instruction changes the **target private-resource error policy** from other-owner/unauthorized `404` hiding to existing-unauthorized `403` and genuinely missing `404` (T74-D01). This is a breaking expectation for consumers of the earlier draft, even though the application-history/review handlers are not implemented. This document records the revised v1 design; it does not claim a runtime rollout, a completed team review or an automatic version migration. FE/BE/QA must update expected outcomes together and identify any existing consumer before release; an implemented consumer would require the migration/versioning review above. Public inactive-club hiding and the explicitly documented application-form/submission availability checks are unchanged by this private-application decision.

Update this Markdown contract, the OpenAPI document, backend DTOs, and frontend types in the same change. Review API changes with both frontend and backend owners. Do not use a database entity as the wire contract.

## 10. Open integration and product decisions

1. Provision the TU API channel, obtain its endpoint URL and Application-Key, and verify access/quota with the project owner before enabling real authentication. The public request/response mapping follows the official TU API documentation; local and CI runs remain on the mock adapter.
2. Keep the DBML and DTO mappings aligned with the executable Flyway schema; add new migrations for future schema changes.
3. Verify the upstream mapping into local student status. Only verified `ACTIVE` is eligible under the adopted matrix; do not infer this from login success.
4. Implement the submission limits in section 11 and complete publication/confirmation DTOs, scheduling and membership transitions within the adopted permissions.
5. Implement the decided committee/admin matrix, including PRESIDENT publication, self-review prohibition, no Admin override, and the enforcement gaps listed in the matrix.
6. Define a separate versioning design if questions must change after publication; current policy permits editing only drafts without applications.

Mark defined but unimplemented APIs as pending, and keep unresolved schemas identified separately. Live TU integration and completed product workflows require their own verification. Authorization policy itself is decided by the permission matrix.

## 11. Application submission

**Contract defined; implementation pending.** This section specifies [US-03](../stories/sprint1/US-03.md) (Sprint 1 carry-over, pending scope metadata review) and [SD-05](../diagrams/sequence/SD-05-submit-application.md). Persistence uses the existing [V1 schema](../../backend/src/main/resources/db/migration/V1__init_schema.sql) and [ERD](../database/TU-ClubHub-ERD-Updated.dbml); no table or column additions are needed for this contract.

Resource model:

| Resource | In this API | Table | Cardinality |
|---|---|---|---|
| Application | Created by this `POST`; returned as `ApplicationSubmission` | `applications` | One per student per round |
| Answer | `answers[]` in the request | `application_answers` | At most one per question of the round |
| Document link | `links[]` in the request | `application_links` | 0–5 per application, in array order |
| Status history entry | Not returned | `application_status_history` | One `NULL → SUBMITTED` entry at creation |

Each application belongs to one published recruitment round and, through that round, to one club.

Decisions on the items US-03 left open, adopted on 2026-10-19:

| Topic | Decision | Reason |
|---|---|---|
| `motivation` length | 1–2,000 characters | Matches the default `application_questions.max_length`, so every text field an applicant fills in has the same limit. A club that needs a longer essay can add a question with a higher `max_length`. |
| Document links | Optional; at most 5 per application | US-03 BR-06 allows an empty field, and requiring documents would block applicants who have none. Five links cover a portfolio, a résumé, and a few certificates. |
| Membership limit scope | Every club recorded in TU-ClubHub, whatever its affiliation level | The project brief sets a five-club limit without distinguishing club types, and `clubs.affiliation_level` is optional with no agreed values. If the university confirms that only university-level clubs count, narrow the count; the API does not change. |
| `Location` of a new application | `/api/v1/me/applications/{applicationId}`, read through US-04 | The applicant must be able to read the URI it receives. The 2026-10-27 T74-D01 decision supersedes the earlier owner-read hiding rule: an existing unauthorized application returns `403 ACCESS_DENIED`, a nonexistent application `404 RESOURCE_NOT_FOUND`. Committee list/detail paths and DTOs still need their own contract under read-only US-09. |
| Inactive target club | `404 RESOURCE_NOT_FOUND` | Public endpoints already hide inactive clubs with `404`, and US-03 BR-02 avoids revealing resources that are not public. `403 ACCESS_DENIED` remains for the applicant's own eligibility. |

### `POST /api/v1/rounds/{roundId}/applications`

Task42 uses the round-scoped path above, replacing the earlier **contract-only** `POST /api/v1/clubs/{clubId}/rounds/{roundId}/applications`. The existing `submitApplication` operation and request/response schemas are reused at the new path; no compatibility alias or second submission operation is specified. Resolve `clubId` from the stored round instead of accepting it in the path or body. [SD-05](../diagrams/sequence/SD-05-submit-application.md) now uses this canonical path; confirm that all consumers use the same operation during team review. Updating the diagram does not imply that a handler or deployed client exists.

Creates the current student's application. Requires a valid `SESSION` cookie, `X-CSRF-TOKEN`, and `Content-Type: application/json`. Path IDs and `questionId` are positive decimal strings without leading zeroes, up to `9223372036854775807`.

- Require an `ACTIVE` account and a verified `student_profiles.student_status = 'ACTIVE'`; login success alone is insufficient. The target club must be `ACTIVE`; an inactive club returns `404`, as on public endpoints. Committee/Admin callers use the same Student permissions; no committee assignment or term is required for this operation.
- Resolve the round and its club from `roundId`; the club must be `ACTIVE`. The round must be `PUBLISHED`, have `published_at` set, satisfy `opens_at <= now < closes_at`, and have `closed_at IS NULL`. Use backend UTC time, sampled after acquiring the round lock.
- Set the applicant from the session and the club from the verified round. Reject unknown JSON fields at every request-object level, including client-supplied applicant, club/round IDs, status, timestamps, or link ordering.
- A student may submit once per round, including after a prior application is withdrawn. A repeated submission is a conflict; it does not update or replay the existing application.
- For this API, the product limit is five distinct clubs with locally recorded memberships satisfying `status = 'ACTIVE'`, `joined_at <= now`, and `ended_at IS NULL`, across all club types. Reject applicants already in the target club or already at that limit. Pending applications do not count, and there is no separate pending-application quota. Confirmation must recheck membership limits; submission creates no membership.

#### Request

```json
{
  "motivation": "I would like to help organize club activities.",
  "answers": [
    { "questionId": "81001", "answerText": "I have organized student workshops." }
  ],
  "links": [
    { "label": "Portfolio", "url": "https://example.org/portfolio" },
    { "label": "Resume", "url": "https://example.org/resume.pdf" }
  ]
}
```

| Field | Contract |
|---|---|
| `motivation` | Required string of 1–2,000 characters with at least one non-whitespace character; stored trimmed. |
| `answers` | Required array; `[]` is valid only when no required answers are missing. At most one answer per question; every `questionId` must belong to this round. |
| `answers[].questionId` | Required positive decimal string; identifies `application_questions.id`. |
| `answers[].answerText` | Required string for each supplied answer; reject blank, enforce that question's `max_length`, and store it trimmed. Every `is_required = true` question needs an answer. Omit unanswered optional questions from the array. |
| `links` | Required array of 0–5 objects; use `[]` when attaching no links. Array order is the display order. |
| `links[].label` | Required string of 1–200 characters with at least one non-whitespace character; stored trimmed. |
| `links[].url` | Required absolute HTTPS URI with a host, at most 2,048 characters. Scheme matching is case-insensitive. Reject whitespace, control characters, and userinfo such as `user:password@host`. Preserve the accepted URL. |

Length limits count Unicode characters in the submitted value, before trimming, so they match the OpenAPI `maxLength` values. A blank value is empty or contains only whitespace. URLs are validated and stored as supplied, without trimming. Null values are invalid for all request fields. Validate all fields before writing. The backend stores links without opening or downloading them; this API does not accept file uploads. The database HTTPS check is a final safeguard and does not replace URI validation.

Only text questions exist in the current model. There is no choice/options schema and no client-supplied question type: a supplied `optionId`, `selectedOptions`, score, applicant identity, application status, or other unknown field is `400 VALIDATION_FAILED`. Reject duplicate `questionId` values even when their answer texts differ; JSON Schema `uniqueItems` alone cannot enforce this identifier-level rule. Missing required answers, blank supplied optional answers, wrong-round/unknown questions, and overlong text also use `400 VALIDATION_FAILED` with indexed `fieldErrors` where applicable.

Loading the form does not reserve a submission or freeze round availability. If a round closes while the student is filling it in, the transaction-time state check returns `409 RESOURCE_CONFLICT` with `reason: ROUND_CLOSED`, with no writes. Current policy permits question edits only on drafts without applications ([permission matrix](../security/permission-matrix.md#3-permission-matrix)); no form version/ETag/precondition token is defined for this POST. Always validate against the current stored question set. If that set changed and an answer is now invalid or required data is missing, use the existing `400 VALIDATION_FAILED`; there is no invented `FORM_CHANGED` conflict. Supporting edits after publication or detecting stale content when IDs/constraints remain valid requires a separately confirmed versioning design (§12 review item R3).

#### Success response

Return `201 Created` only after the entire transaction commits, with `Cache-Control: no-store` and `Location: /api/v1/me/applications/{id}`. US-04 is responsible for the future `GET` at this URI and the applicant's list at `GET /api/v1/me/applications`; their response schemas and handlers are not defined or implemented by this submission contract.

```json
{
  "id": "90001",
  "clubId": "20001",
  "roundId": "70001",
  "status": "SUBMITTED",
  "submittedAt": "2026-10-19T09:30:00Z"
}
```

All five response fields are required. `id`, `clubId`, and `roundId` use the decimal-string ID format; `status` is always `SUBMITTED`; `submittedAt` is a server-generated ISO 8601 UTC timestamp. The UI displays `SUBMITTED` as “รอพิจารณา (Pending)”. Internal decisions and review notes are not included.

#### Database mapping and transaction

| Table | Values written |
|---|---|
| `applications` | Generated `id`; verified `round_id` and `club_id`; session user as `applicant_id`; trimmed `motivation`; `status = 'SUBMITTED'`; server time as `submitted_at` and `updated_at`; `version = 0`. Decision/response fields remain null. |
| `application_answers` | Generated `id`; new `application_id`; server-validated `round_id` and `question_id`; trimmed `answer_text`. |
| `application_links` | Generated `id`; new `application_id`; trimmed `label`; validated `url`; `display_order = array index + 1`; server time as `created_at`. |
| `application_status_history` | Generated `id`; new `application_id`; `from_status = NULL`; `to_status = 'SUBMITTED'`; session user as `actor_id`; `reason = NULL`; submission time as `changed_at`. |

`application_links.url` is `VARCHAR(2048)`, `label` is `VARCHAR(200)`, and `(application_id, display_order)` is unique. Multiple links are separate rows associated with one application. Empty arrays create no answer/link rows.

Recheck authorization, membership eligibility, question membership/requirements, and round state inside the write transaction. Serialize each submission with closing or cancelling the same round by locking the round row before sampling the current time, so a submission either commits before the close takes effect or sees the closed round. Write all four record groups atomically. Failed validation or any failed write leaves none of the new rows committed. No partial-success response is allowed.

Keep `uq_applications_round_applicant` as the final duplicate safeguard: concurrent identical submissions can produce only one application; translate that specific uniqueness conflict into `409` after rolling back. Other database failures must not be mislabeled as duplicates. Composite foreign keys already enforce application/round/club and answer/question/round consistency. Do not modify or create membership records during submission. This contract creates no `notifications` row; if an `APPLICATION_SUBMITTED` notification is added later, insert it in the same transaction (US-03 BR-09).

#### Errors

Use the shared Problem format with `Cache-Control: no-store`. Error `type` values use the stable prefix `urn:tuclubhub:problem:` and the suffixes below.

| HTTP | `code` | Type suffix | Condition |
|---|---|---|---|
| `400` | `INVALID_RESOURCE_ID` | `invalid-resource-id` | Invalid/out-of-range path ID. |
| `400` | `VALIDATION_FAILED` | `validation-error` | Malformed body, unknown fields, missing/invalid answers or links, duplicate question IDs, or a question from another round; include indexed `fieldErrors`, e.g. `links[0].url`. |
| `401` | `AUTHENTICATION_REQUIRED` | `authentication-required` | Missing, invalid, or expired session. |
| `403` | `ACCOUNT_NOT_ALLOWED` | `account-not-allowed` | Suspended account; invalidate its session. |
| `403` | `ACCESS_DENIED` | `access-denied` | Missing verified Active student status. |
| `403` | `CSRF_INVALID` | `csrf-invalid` | Missing/invalid CSRF header; this check may precede authentication. |
| `404` | `RESOURCE_NOT_FOUND` | `resource-not-found` | Round missing, its club missing or not `ACTIVE`, or round never published (`published_at IS NULL`). |
| `409` | `RESOURCE_CONFLICT` | `resource-conflict` | A conflict identified by the required `reason` field below. |
| `500` | `INTERNAL_ERROR` | `internal-error` | Unexpected failure; roll back all submission writes. |
| `503` | `SERVICE_UNAVAILABLE` | `service-unavailable` | Database unavailable; do not report a successful submission. |

Checks run in this order, and the first failure determines the response. This is the authoritative order for US-03; request checks needing no database lookup run before the eligibility check:

1. CSRF token: `403 CSRF_INVALID`. This check may precede authentication.
2. Session and account: `401 AUTHENTICATION_REQUIRED`, then `403 ACCOUNT_NOT_ALLOWED`.
3. Path IDs and request body, without database lookups: `400 INVALID_RESOURCE_ID` or `400 VALIDATION_FAILED`.
4. Verified Active student status: `403 ACCESS_DENIED`.
5. Round lookup and its Active club, with `published_at` set: `404 RESOURCE_NOT_FOUND`.
6. Round state after the round lock: `409` with `ROUND_CANCELLED`, `ROUND_NOT_OPEN`, or `ROUND_CLOSED`.
7. Answers checked against the round's questions: `400 VALIDATION_FAILED`.
8. Existing application and memberships: `409` with `APPLICATION_ALREADY_EXISTS`, `ALREADY_MEMBER`, or `MEMBERSHIP_LIMIT_REACHED`.

Conflict `reason` values, in check order:

| `reason` | Condition |
|---|---|
| `ROUND_CANCELLED` | A previously published round was cancelled. |
| `ROUND_NOT_OPEN` | `now < opens_at`. |
| `ROUND_CLOSED` | `closed_at IS NOT NULL` or `now >= closes_at`. |
| `APPLICATION_ALREADY_EXISTS` | An application already exists for this student and round, in any status. |
| `ALREADY_MEMBER` | The student already has an effective Active membership in this club. |
| `MEMBERSHIP_LIMIT_REACHED` | The student has effective Active memberships in five distinct clubs. |

For example, a duplicate uses `status: 409`, `code: RESOURCE_CONFLICT`, and `reason: APPLICATION_ALREADY_EXISTS`, with the shared `type`, `title`, `instance`, and `traceId` fields. Do not expose another applicant's identity or any stored answers/links in error bodies. No numeric rate limit is introduced by this contract; any future limiter must follow the shared `429`/`Retry-After` policy before deployment.

Clients must not retry a `4xx` response unchanged. After a lost response or a `5xx`, retrying is safe without an idempotency key because the one-application-per-round rule prevents a second application. The earlier attempt may still have committed, so when such a retry returns `409`, check the applicant's history (US-04) before telling the student that nothing was submitted; `APPLICATION_ALREADY_EXISTS` means the application exists.

## 12. Round application form (Task42)

**Review status: not reviewed or approved. Implementation pending.** Task42 specifies two operations in the existing OpenAPI 3.1.0 [openapi.yaml](openapi.yaml): `getRoundApplicationForm` and `submitApplication`. It does not add a specification file or change the committee management contract in `rounds.openapi.yaml` (3.0.3). Submission rules in §11 remain decided. On 2026-10-20 the Task42 requester confirmed that GET uses the same ACTIVE account/student and currently open-round checks as submission. This records that explicit task decision; it does not claim a PO/team review has occurred. Task74 records the applicant-form action in the [permission-matrix handoff](../security/permission-matrix.md#s2-permission-matrix) for review; that documentation addition does not complete PO/team approval. Remaining questions are listed below and tracked under T74-D09. The requested round-scoped POST replaces the earlier contract-only club-nested route as explained in §11; no implementation or deployed-client compatibility is claimed.

### `GET /api/v1/rounds/{roundId}/application-form`

| Concern | Contract / review status |
|---|---|
| ID | Required `roundId` path parameter uses `PositiveBigintId`: a positive decimal string without leading zeroes, maximum `9223372036854775807`. `0`, negative, fractional, nonnumeric, and out-of-range values are `400 INVALID_RESOURCE_ID`. |
| Authentication | `security: [{SessionCookie: []}]`, cookie name `SESSION`. This is an applicant workflow, **not a Task35 public endpoint**. Session authentication is consistent with US-03; the ACTIVE account/student and open-round requirements were confirmed by the Task42 requester on 2026-10-20. GET needs no CSRF header. |
| Read eligibility — Task42 confirmation | Require an ACTIVE account and verified ACTIVE student profile; Committee/Admin callers use Student rights. Do not infer a committee management grant. Duplicate-application/membership conflicts remain mandatory on POST. They are not additional GET rejections in this contract; changing that needs a separate decision (R1). |
| Availability — Task42 confirmation | Return `200` only for the round's ACTIVE club and a `PUBLISHED` round with `published_at` set, `closed_at IS NULL`, and `opens_at <= now < closes_at`. Use backend UTC time, sampled once for this read; never use client time. |
| Hidden resources | Missing round, missing/inactive club, or never-published round: `404 RESOURCE_NOT_FOUND`, without distinguishing whether a hidden resource exists. |
| Unavailable form | For a previously published round, check cancellation first (`ROUND_CANCELLED`), then `now < opens_at` (`ROUND_NOT_OPEN`), then `closed_at IS NOT NULL` or `now >= closes_at` (`ROUND_CLOSED`): `409 RESOURCE_CONFLICT`. This does not authorize preview outside the window. |
| Success | Direct `RoundApplicationForm` resource, not an `items/page` wrapper: the embedded `questions` array is the complete form, not a separate collection endpoint. Include all questions sorted by `displayOrder ASC, id ASC` (numeric ID), with unique IDs/order per round. Gaps in order are valid. |
| Cache | Every response, including failures, uses `Cache-Control: no-store`. A loaded form grants no reservation and no guarantee that POST will succeed. |

Example `200`:

```json
{
  "round": {
    "id": "70001",
    "clubId": "20001",
    "title": "Volunteer recruitment",
    "description": "Join our student activities team.",
    "eligibilityText": "Active TU students interested in volunteering.",
    "opensAt": "2026-10-20T02:00:00Z",
    "closesAt": "2026-11-01T10:00:00Z"
  },
  "questions": [
    {
      "id": "81001",
      "type": "TEXT",
      "questionText": "Describe an activity you helped organize.",
      "isRequired": true,
      "displayOrder": 1,
      "maxLength": 2000
    },
    {
      "id": "81002",
      "type": "TEXT",
      "questionText": "What other experience would you like to share?",
      "isRequired": false,
      "displayOrder": 3,
      "maxLength": 1000
    }
  ]
}
```

If no custom questions exist, keep the same resource shape and return `questions: []`; `motivation` and `links` still follow the POST request schema. OpenAPI also includes a complete no-question example with `eligibilityText: null`.

#### DTO/schema mapping and privacy

All objects are dedicated allowlists with `additionalProperties: false`. Every property listed below is required in the response; only `eligibilityText` is nullable. OpenAPI 3.1 uses `type: [string, 'null']`, not the 3.0 `nullable` keyword.

| Schema / property | Type and source |
|---|---|
| `RoundApplicationForm.round` | `ApplicationFormRound`, a dedicated projection of the round, not `RecruitmentRound`/committee DTO. |
| `RoundApplicationForm.questions` | Array of `ApplicationTextQuestion`; zero or more; no null items. |
| `ApplicationFormRound.id`, `clubId` | `PositiveBigintId`, from stored `recruitment_rounds.id` / `club_id`. |
| `ApplicationFormRound.title` | String, 1–200 characters, from `recruitment_rounds.title`. |
| `ApplicationFormRound.description` | Non-null string, from applicant-facing `recruitment_rounds.description`. |
| `ApplicationFormRound.eligibilityText` | String or null, from `eligibility_text`; display text, not a newly invented automated eligibility condition. |
| `ApplicationFormRound.opensAt`, `closesAt` | UTC ISO 8601 `date-time` strings ending `Z`, from `TIMESTAMPTZ`. Opening is inclusive, closing exclusive. Equal instants with UTC/+07:00 offsets have the same meaning; serialize responses in UTC. Manual closure may end submission earlier. |
| `ApplicationTextQuestion.id` | `PositiveBigintId`, from `application_questions.id`; send this as POST `answers[].questionId`. |
| `ApplicationTextQuestion.type` | Enum `TEXT`, derived from the text-only model; no new database column. No choices/options schema, numeric answer schema, or upload schema is introduced. |
| `ApplicationTextQuestion.questionText` | Nonblank string, from `prompt`; uses the existing question-view naming convention. |
| `ApplicationTextQuestion.isRequired` | Boolean, from `is_required`; do not confuse required answer content with required response keys. |
| `ApplicationTextQuestion.displayOrder` | Positive `int32` (1–2147483647), from `display_order`; need not be contiguous. |
| `ApplicationTextQuestion.maxLength` | Positive `int32` (1–2147483647), from `max_length`; database default 2000. Count answer input in Unicode characters before trimming. |

The form deliberately excludes existing answers/applications, applicant identity, contact information of other people, review scores, internal comments, creator IDs, raw `version`, result-publication metadata, and management timestamps. Nested references reach only these dedicated form schemas and `PositiveBigintId`. POST reuses `ApplicationSubmissionRequest`, `ApplicationAnswerInput`, `ApplicationLinkInput`, `ApplicationSubmission`, and `ApplicationSubmissionConflict`; it never accepts or returns a persistence entity. Submission errors must not echo another student's data.

The existing frontend prototype is not the wire contract: `reason`, `orderIndex`, `documentTitle`/`documentUrl`, body `roundId`, and the mock `{success, message, applicationId}` response require mapping to `motivation`, `displayOrder`, `links[]`, path `roundId`, and `ApplicationSubmission`. There is no UI change in Task42.

#### GET errors and POST parity

Use the shared `application/problem+json` `Problem` schema (`type`, `title`, `status`, `code`, `traceId`; optional `detail`, `instance`, `fieldErrors`). Never include SQL, stack traces, credentials, session IDs, or applicant/reviewer content.

| GET status | Code / condition |
|---|---|
| `400` | `INVALID_RESOURCE_ID`; invalid/out-of-range `roundId`. |
| `401` | `AUTHENTICATION_REQUIRED`; no valid session. |
| `403` | `ACCOUNT_NOT_ALLOWED` for a suspended account, invalidating session; student-eligibility denial uses `ACCESS_DENIED`. No CSRF requirement on GET. |
| `404` | `RESOURCE_NOT_FOUND` hiding unavailable resources as described above. |
| `409` | `RESOURCE_CONFLICT` with required `reason` restricted by `ApplicationFormAvailabilityConflict` to `ROUND_CANCELLED`, `ROUND_NOT_OPEN`, or `ROUND_CLOSED`. Do not use submission-duplicate/member reasons on GET without an R1 decision. |
| `500` / `503` | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` using the existing shared responses; no sensitive diagnostics. |

GET checks session/account → ID → verified student → visible resource → round state, applying the existing submission ordering to the shared checks and omitting CSRF/body checks. The Task42 requester confirmed the shared eligibility/window policy; formal PO/team review is still pending. POST retains the already-decided §11 ordering and errors, including CSRF first, answer validation, duplicate/membership conflicts, and atomic rollback. Successful POST returns `201 ApplicationSubmission` plus `Location` and `Cache-Control: no-store`; it does not return this form or any reviews.

### Evidence and implementation handoff

| Rule / design input | Repository evidence |
|---|---|
| Authenticated student, required answers, HTTPS links, one submission per round, server-side time check, atomic writes | [US-03](../stories/sprint1/US-03.md), AC-01–06 and BR-01–11; existing §11 decisions dated 2026-10-19. |
| Student/club Active, Student rights for Committee/Admin, no role override; question edits only on drafts without applications | [Permission matrix](../security/permission-matrix.md), §§1–3; this policy takes precedence over older unresolved wording in stories. The Task42 requester confirmed the form-read account/student/window policy on 2026-10-20; Task74 records that action for PO/team review without claiming approval. |
| Text-only questions, stable question identity, required flag, display order | [US-08](../stories/sprint1/US-08.md); [ApplicationQuestionService](../../backend/src/main/java/com/tu/clubhub/recruitment/service/ApplicationQuestionService.java) uses `questionText`, `isRequired`, and `displayOrder`; its committee-only read must not be reused as applicant authorization. |
| Real persisted types/constraints | [V1 migration](../../backend/src/main/resources/db/migration/V1__init_schema.sql): `recruitment_rounds`, `application_questions`, `applications`, `application_answers`, `application_links`, `application_status_history`; [ERD](../database/TU-ClubHub-ERD-Updated.dbml). Questions have `max_length`, no question-type/options/file columns. |
| Round fields | [RecruitmentRound](../../backend/src/main/java/com/tu/clubhub/recruitment/domain/RecruitmentRound.java); [rounds.openapi.yaml](rounds.openapi.yaml) for management semantics. No full internal schema is referenced by form responses. |
| Server-side UTC clock, session/CSRF, no automatic public access for round-scoped routes | [SecurityConfiguration](../../backend/src/main/java/com/tu/clubhub/config/SecurityConfiguration.java), [AbsoluteSessionTimeoutFilter](../../backend/src/main/java/com/tu/clubhub/config/AbsoluteSessionTimeoutFilter.java); §§2–3. Current filters are not proof of the future endpoint's complete authorization. |
| Prototype mismatch, not an established HTTP client | [applicationForm.ts](../../frontend/src/features/applications/types/applicationForm.ts), [applicationService.ts](../../frontend/src/features/applications/services/applicationService.ts). Submission is simulated, so it cannot override the contract. |

### PO / user representative / development review checklist

No review has taken place as part of writing this contract. The Task42 requester confirmed the account/student/window policy above; the following questions still need a decision or review handoff:

| Item | Question and options | Effect / proposed direction |
|---|---|---|
| R1 | Should an existing application, existing target membership, or the five-club limit additionally block reading? | Baseline account/student/window checks were confirmed by the requester. Keep duplicate/member conflicts on POST under this contract; adding them to GET would prevent revisiting a form for reference. The alternative is GET conflicts too, requiring explicit errors and precedence in both documents. |
| R2 | Review the applicant-form action recorded in Task74's permission-matrix handoff and obtain PO/user-representative review. | The account/student/window policy is defined here from the 2026-10-20 task answer, not from Task35 public access. Recording the row is not approval. Read-only preview outside the window is not included; changing it later would require an explicit contract decision. |
| R3 | Is the current immutable-after-publication question policy sufficient, or must the API reject any stale form snapshot even if IDs and constraints still validate? | Current decided policy needs no new version field; POST revalidates the stored set. Strict snapshot rejection or edits after publication require a separate versioning/precondition contract; do not silently add `formVersion`, `If-Match`, or `FORM_CHANGED`. |
| R4 | Confirm all consumers use Task42's round-scoped POST; SD-05's reference has been corrected in the Task74 document update. | One submission operation/schema remains; no compatibility alias is defined. Applicant `Location` remains `/api/v1/me/applications/{id}` and that read API still needs implementation. A corrected document is not evidence of client integration. |

- [ ] PO/user representative reviews the requester-confirmed read policy and its recorded permission-matrix action, resolves R1/R2, and records the actual review outcome. Update both contracts together if the decision changes.
- [ ] PO/team confirms R3/R4, the text-only question model, optional 0–5 HTTPS links, and the existing §11 duplicate/membership rules.
- [ ] Frontend/backend agree on the dedicated DTO allowlist, `eligibilityText: null`, empty questions, Unicode lengths, field-error paths, UTC serialization, and prototype mapping.
- [ ] Backend plan covers current account/student checks, session/CSRF, resource hiding, same-round transaction lock, unique-conflict mapping, rollback, and transaction-time deadline checks.
- [ ] QA plans positive/negative ID bounds, session/CSRF errors, required/optional/unknown/duplicate answers, overlong text, invalid/extra fields, invalid HTTPS links, duplicate submission, and a close occurring after form load.
- [ ] Run OpenAPI structural/reference/example validation and `git diff --check`; record actual results separately from product review approval. No application implementation or runtime test result is implied by specification validation.
