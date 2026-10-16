# TU-ClubHub API Contract

| Property | Value |
|---|---|
| Version | `v1` |
| Contract status | Proposed foundation contract |
| Last updated | 2026-10-15 |
| Audience | Frontend and backend developers |

This document defines the shared HTTP contract for the TU-ClubHub foundation. It is based on the [scaffold context](../architecture/scaffold-context.md) and [system architecture](../architecture/system-architecture.md). The contract describes the intended behavior and remains the target even where the current implementation is incomplete.

The machine-readable OpenAPI 3.1 document is [`docs/api/openapi.yaml`](docs/api/openapi.yaml). Keep it in sync with this document and with the DTOs consumed by the frontend. The backend implements the TU authentication adapter and `/api/v1/auth` endpoints, including the 8-hour absolute session timeout and fresh CSRF token in the login response. Production club endpoints are not implemented, so the public club response fields below remain an initial proposal to confirm against the ERD.

## 1. Contract scope

The foundation contract covers:

- Session-based authentication through the TU Authentication API.
- CSRF token bootstrap for browser requests.
- The current user's minimal account identity.
- Public club detail for the first frontend/backend vertical slice.
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

### Collection convention for future endpoints

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

Only return sort fields explicitly supported by the endpoint. The collection wrapper is a convention for future collection endpoints; the foundation currently defines no collection endpoint.

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

Returns the authenticated user's minimal account identity. It returns `401 AUTHENTICATION_REQUIRED` when no authenticated session exists or its idle/absolute lifetime has expired. The response is a UI hint only; the backend still performs authorization for each operation. Committee privileges are assignments scoped to a club and term, not a global user role.

**`200 OK`** with `Cache-Control: no-store`.

```json
{
  "user": {
    "id": "10001",
    "role": "USER"
  }
}
```

`role` is `USER` or `ADMIN`. Student eligibility and normalized TU student status are not included until the TU contract and eligibility policy are agreed. Do not infer committee access from `role`.

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

Replaces the editable profile fields for a club and returns the updated public profile. Requires an authenticated session, the current CSRF header, and an active `COMMITTEE` or `PRESIDENT` assignment for this club and its current term. The server rechecks assignment, membership, and account status on every request. A missing or expired session returns `401`; an authenticated caller without an effective assignment returns `403`.

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
| `403` | `ACCESS_DENIED`, `CSRF_INVALID` | Caller lacks an effective committee assignment, or CSRF validation failed |
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
| `403` | `FORBIDDEN`, `CSRF_INVALID`, `ACCOUNT_NOT_ALLOWED` | Authenticated user lacks permission, CSRF check fails, or account is not allowed |
| `404` | `RESOURCE_NOT_FOUND`, `CLUB_NOT_FOUND` | Resource does not exist or is not visible to this caller |
| `405` | `METHOD_NOT_ALLOWED` | The path exists but does not support the request method |
| `409` | `RESOURCE_CONFLICT` | Duplicate request or invalid current-state transition |
| `429` | `RATE_LIMITED` | Request rate limit exceeded; include `Retry-After` when known |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |
| `503` | `SERVICE_UNAVAILABLE`, `AUTH_PROVIDER_UNAVAILABLE` | A required dependency such as the database or TU Authentication API is unavailable |

The table is the shared error vocabulary. An endpoint's OpenAPI operation lists the errors relevant to it. If rate limiting is introduced, its actual thresholds and retry policy must be documented before release; no numeric rate limit is set by this contract.

## 7. Authorization rules

- Public club detail and published recruitment information can be read without login.
- `/auth/me` and future applicant operations require an authenticated session.
- An applicant may read or act on only their own application.
- Committee access is checked against the club assignment and its active term on every request.
- Confirmation or decline is limited to the applicant, after results are published, and before the applicable deadline.
- Central dashboard access is limited to the agreed global `ADMIN` scope. `ADMIN` alone does not imply permission to edit every club or publish its results.
- The backend does not trust hidden buttons, route guards, cached roles, or client-provided ownership/status values.

Detailed permissions for result publication, committee self-review, and administrative overrides remain open decisions. Do not expose write endpoints for those operations until the permission matrix is approved.

## 8. Product APIs to specify before implementation

Remaining product stories identify resource areas that still need concrete request fields and policies before implementation. Add their paths, DTOs, status codes, authorization rules, and examples to this document and `docs/api/openapi.yaml`:

| Story | Resource area | Decisions needed |
|---|---|---|
| US-01 | Club search and filters | Search/filter fields, sort options, and category/tag semantics |
| US-03 | Application submission | Eligibility, required answers, HTTPS link rules, quota, duplicate behavior, and concurrency handling |
| US-04 | Applicant application list/detail/history | Which history is visible and how unpublished results are hidden |
| US-05 | Confirm or decline an offer | Result publication workflow, deadline policy, idempotency, and membership transaction |
| US-06 | Club profile editing | Conflict handling and concurrent update policy |
| US-07 | Recruitment rounds | Round publication, schedule validation, and close/reopen policy |
| US-08 | Recruitment questions | Question types, validation, and freeze/version policy after applications exist |
| US-09 | Committee application review | Committee scope, field-level privacy, and self-review rule; reading is read-only |
| US-10 | Central dashboard | Metrics definitions, academic period, and data scope |
| Backlog | In-app notifications | Event triggers, read/unread behavior, and ownership |

Application status values referenced by the architecture are `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`, `WITHDRAWN`, and `EXPIRED`. The presence of a status does not define a permitted transition or mean that its workflow is implemented. Use `SUBMITTED` as the proposed initial status; resolve older `PENDING` references before implementation. Do not publish internal decision data or application history before `resultsPublishedAt`.

## 9. Compatibility and change policy

The path prefix `/api/v1` is the major API version. Adding optional response fields or new endpoints is additive. Removing/renaming fields, changing types, changing authentication, or changing established status/error behavior is breaking and requires a migration plan and a new major version.

Update this Markdown contract, the OpenAPI document, backend DTOs, and frontend types in the same change. Review API changes with both frontend and backend owners. Do not use a database entity as the wire contract.

## 10. Open integration and product decisions

1. Provision the TU API channel, obtain its endpoint URL and Application-Key, and verify access/quota with the project owner before enabling real authentication. The public request/response mapping follows the official TU API documentation; local and CI runs remain on the mock adapter.
2. Approve the proposed ERD and confirm club and recruitment DTO fields against it.
3. Agree how TU student status maps to local student eligibility.
4. Agree application quota, result publication, offer deadlines, and membership transitions.
5. Approve the committee/admin permission matrix, including self-review and override rules.
6. Agree how recruitment question changes behave after applications have been submitted.

Until these decisions are made, keep affected APIs marked as proposed and do not claim real TU integration or completed product workflows.
