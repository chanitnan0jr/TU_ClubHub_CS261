# TU-ClubHub API Contract

| Property | Value |
|---|---|
| Version | `v1` |
| Contract status | Proposed foundation contract |
| Last updated | 2026-10-19 |
| Audience | Frontend and backend developers |

This document defines the shared HTTP contract for the TU-ClubHub foundation. It is based on the [scaffold context](../architecture/scaffold-context.md) and [system architecture](../architecture/system-architecture.md). The contract describes the intended behavior and remains the target even where the current implementation is incomplete.

Authorization policy was adopted on 2026-10-19 in the [Permission Matrix](../security/permission-matrix.md). Its Active, term, self-review, and Admin rules are decided; the matrix separately records implementation gaps. Adoption does not imply that future product endpoints exist.

The machine-readable OpenAPI 3.1 document is [`docs/api/openapi.yaml`](openapi.yaml). Keep it in sync with this document and with the DTOs consumed by the frontend. The backend implements the TU authentication adapter and `/api/v1/auth` endpoints, including the 8-hour absolute session timeout and fresh CSRF token in the login response. The public endpoints added below are API contracts only and are not yet implemented; their response fields are limited to values supported by the current club DTOs and ERD.

## 1. Contract scope

The foundation contract covers:

- Session-based authentication through the TU Authentication API.
- CSRF token bootstrap for browser requests.
- The current user's minimal account identity.
- Public club profiles and currently open recruitment rounds for active clubs.
- A minimal health endpoint for operations.

Application submission and review, recruitment management, membership decisions, notifications, search, and dashboards are product backlog work. Their request and response schemas are not defined here. They must be added to this contract before either client or server implements those stories. A not-yet-implemented endpoint must not return a success response as a stub.

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

For non-empty pages, each item contains only `id`, `name`, `opensAt`, and `closesAt`. `name` is the public display name for the round (mapped from the ERD's `recruitment_rounds.title`). The contract uses the standard zero-based `page` and `size` parameters (default `0` and `20`, maximum size `100`). Timestamps are `TIMESTAMPTZ` instants serialized as ISO 8601 UTC values ending in `Z`; `opensAt` and `closesAt` are not local wall-clock values. **Implementation assumption to confirm:** evaluate the window using one backend current instant (`Clock.instant()`) per request, with deployed hosts synchronized to UTC. The ERD defines the boundary behavior but does not specify the clock source or clock-skew tolerance.

Both endpoints use the shared `application/problem+json` `Problem` error format for `400 INVALID_RESOURCE_ID`, `404 CLUB_NOT_FOUND`, `405 METHOD_NOT_ALLOWED`, `503 SERVICE_UNAVAILABLE`, and unexpected `500 INTERNAL_ERROR`. Neither endpoint returns `401` or `403` because both are public reads.

### `GET /api/v1/clubs/{clubId}`

Returns a public club profile without requiring login. `clubId` is a decimal string ID. The response may include only published recruitment rounds and public profile fields; it must not expose draft rounds, applicant data, committee-only information, or internal notes. The backend does not fetch images or documents from URLs. The response includes the public profile columns from `clubs`, the category, tags, and published recruitment rounds. Database `bigint` IDs are decimal strings on the wire.

**`200 OK`** (proposed DTO; confirm exact fields against the approved ERD)

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

Returns the minimum operational health status needed by local tooling and the hosting platform. It is not part of `/api/v1` and must not expose environment variables, secrets, database connection details, or internal diagnostics. Expected responses are `200` when healthy and a non-2xx status when unhealthy, in the framework's configured health format.

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

`fieldErrors` is omitted when an error is not associated with request fields. Clients should branch on `status` and `code`, not on localized human-readable messages.

| Status | Typical code | Use |
|---|---|---|
| `400` | `VALIDATION_FAILED`, `INVALID_RESOURCE_ID` | Malformed JSON, invalid parameter, or field validation failure |
| `401` | `AUTHENTICATION_REQUIRED`, `AUTHENTICATION_FAILED` | Missing/invalid authentication or rejected login credentials |
| `403` | `ACCESS_DENIED`, `CSRF_INVALID`, `ACCOUNT_NOT_ALLOWED` | Authenticated user lacks permission, CSRF check fails, or account is not allowed |
| `404` | `RESOURCE_NOT_FOUND`, `CLUB_NOT_FOUND` | Resource does not exist or is not visible to this caller |
| `405` | `METHOD_NOT_ALLOWED` | The path exists but does not support the request method |
| `409` | `RESOURCE_CONFLICT` | Duplicate request or invalid current-state transition |
| `429` | `RATE_LIMITED` | Request rate limit exceeded; include `Retry-After` when known |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |
| `503` | `SERVICE_UNAVAILABLE`, `AUTH_PROVIDER_UNAVAILABLE` | A required dependency such as the database or TU Authentication API is unavailable |

The table is the shared error vocabulary. An endpoint's OpenAPI operation lists the errors relevant to it. If rate limiting is introduced, its actual thresholds and retry policy must be documented before release; no numeric rate limit is set by this contract.

## 7. Authorization rules

The [Permission Matrix](../security/permission-matrix.md) is authoritative. The following rules are adopted policy, including for product APIs that are not implemented yet:

- Public reads require no login and expose only active clubs and recruitment information allowed by the public endpoint.
- All protected operations require a valid session and an `ACTIVE` account checked against current database state. On detecting suspension, return `403 ACCOUNT_NOT_ALLOWED` and invalidate the session. Public access and session cleanup remain available; unsafe requests still require CSRF.
- Student eligibility requires a verified `student_profiles.student_status = 'ACTIVE'`. Successful TU login alone does not establish eligibility. Missing or unverified status grants no student or committee privileges.
- Committee access requires an active account, student profile, club, membership, and assignment for the actual resource's club. Membership must have started and not ended; assignment must be unrevoked with `starts_at <= now < ends_at`. The start is inclusive and the end exclusive, using backend UTC time. Recheck inside write transactions; no scheduled expiry job or client refresh is needed to remove expired privileges.
- The global role remains `USER` or `ADMIN`; `COMMITTEE`/`PRESIDENT` are club assignment roles. Admin has no term of its own, but acting as committee requires the same effective assignment as anyone else.
- Applicants may access only their own applications. An active account may read its existing private records even when student or club status is inactive. Hide unpublished results and internal review notes. Applicant access to another person's private resource returns `404 RESOURCE_NOT_FOUND`.
- Confirming an offer requires active student and club status, ownership, a published accepted result in a non-cancelled round, and `now < confirmation_deadline`. Declining requires active account, ownership, the same result/deadline conditions, but does not require student or club Active status.
- A user who has an application in a round, in any status, cannot use committee permissions for that round. This includes internal reads, round changes, decisions, cancellation, and publication; withdrawing an application does not lift the restriction. Filter such rounds before committee pagination/counts.
- COMMITTEE/PRESIDENT may record internal decisions after recruitment closes and before publication. Only an effective PRESIDENT without an application in that round may publish results or cancel a round, subject to the state/time rules in the matrix. Editing published results and accepting/declining on behalf of others are denied.
- Admin may access aggregate university statistics and manage committee appointments and limited initial membership provisioning. Admin cannot appoint itself, read application content through its global role, or override Active, terms, ownership, self-review, or published decisions. The app does not grant global-role/account-status/club-status management permissions in this scope.
- The backend verifies resource-parent relationships and current permissions; it does not trust hidden buttons, cached roles, or client-provided ownership/status values. Missing permissions, expired terms, inactive eligibility, and self-review use `403 ACCESS_DENIED`; valid authorization followed by a state/deadline/version conflict uses `409 RESOURCE_CONFLICT`. CSRF rejection may precede these checks.

Recruitment management contracts are in [rounds.openapi.yaml](rounds.openapi.yaml). Defining these permissions does not add the missing application, publication, dashboard, or assignment-management endpoints; those require their own DTOs and implementation.

## 8. Product APIs to specify before implementation

Remaining product stories identify resource areas that still need concrete request fields and policies before implementation. Add their paths, DTOs, status codes, authorization rules, and examples to this document and `docs/api/openapi.yaml`:

| Story | Resource area | Decisions needed |
|---|---|---|
| US-01 | Club search and filters | Search/filter fields, sort options, and category/tag semantics |
| US-03 | Application submission | Student Active is decided in the matrix; define verified status integration, round-specific eligibility, answers, links, quota, duplicates, and concurrency |
| US-04 | Applicant application list/detail/history | Owner-only access and hiding unpublished results/internal notes are decided; define response/status mapping |
| US-05 | Confirm or decline an offer | Ownership/Active/deadline permissions are decided; implement publication, idempotency, and membership transaction |
| US-06 | Club profile editing | Conflict handling and concurrent update policy |
| US-07 | Recruitment rounds | Round publication, schedule validation, and close/reopen policy |
| US-08 | Recruitment questions | Current policy permits changes only on drafts without applications; define any future question versioning separately |
| US-09 | Committee application review | Scope, privacy boundaries, and self-review are decided in the matrix; current story remains read-only; decision/publication need separate implementation work |
| US-10 | Central dashboard | Admin aggregate access is decided; define metrics and academic-period attribution |
| Backlog | Committee appointment administration | Admin-only authorization is decided; define appointment/revocation/bootstrap APIs and audit storage |
| Backlog | In-app notifications | Event triggers, read/unread behavior, and ownership |

Application status values referenced by the architecture are `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`, `WITHDRAWN`, and `EXPIRED`. The presence of a status does not define a permitted transition or mean that its workflow is implemented. Use `SUBMITTED` as the proposed initial status; resolve older `PENDING` references before implementation. Do not publish internal decision data or application history before `resultsPublishedAt`.

## 9. Compatibility and change policy

The path prefix `/api/v1` is the major API version. Adding optional response fields or new endpoints is additive. Removing/renaming fields, changing types, changing authentication, or changing established status/error behavior is breaking and requires a migration plan and a new major version.

Update this Markdown contract, the OpenAPI document, backend DTOs, and frontend types in the same change. Review API changes with both frontend and backend owners. Do not use a database entity as the wire contract.

## 10. Open integration and product decisions

1. Provision the TU API channel, obtain its endpoint URL and Application-Key, and verify access/quota with the project owner before enabling real authentication. The public request/response mapping follows the official TU API documentation; local and CI runs remain on the mock adapter.
2. Approve the proposed ERD and confirm club and recruitment DTO fields against it.
3. Verify the upstream mapping into local student status. Only verified `ACTIVE` is eligible under the adopted matrix; do not infer this from login success.
4. Agree application quota and complete publication/confirmation DTOs, scheduling and membership transitions within the adopted permissions.
5. Implement the decided committee/admin matrix, including PRESIDENT publication, self-review prohibition, no Admin override, and the enforcement gaps listed in the matrix.
6. Define a separate versioning design if questions must change after publication; current policy permits editing only drafts without applications.

Until the remaining integration and workflow work is complete, keep affected APIs marked as proposed and do not claim real TU integration or completed product workflows. Authorization policy itself is decided by the permission matrix.
