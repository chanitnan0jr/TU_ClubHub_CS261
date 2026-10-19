# TU-ClubHub frontend

React 19, TypeScript 6, Vite 8, and Tailwind CSS 4. Versions are recorded in [package.json](package.json) and the lockfile.

## Current screens and integration

Reviewed from source on 2026-10-19; this is not a build or test report.

| Area | Current behavior |
|---|---|
| Main app | `main.tsx` mounts `AuthProvider` and `App`; users see login, then their account ID/role and logout. There is no application router yet. |
| Authentication | `AuthContext` calls the `csrf`, `login`, `me`, and `logout` endpoints under `/api/v1/auth`, sending cookies and CSRF for writes. |
| Club editor | `ClubEditFormContainer`, `useClubProfile`, and `clubApi.ts` exist but are not mounted in the main app. The client calls a pending `GET /api/v1/clubs/{clubId}`; the corresponding `PUT` exists. |
| Club detail | `ClubDetailPage` uses mock data from `clubService.ts` and is not mounted. The public backend APIs exist but still need connecting. |
| Recruitment | `RecruitmentRoundForm` passes form state to an `onSubmit` prop; the app does not yet wire it to the round API. |
| Question management | Uses sample data and per-question paths under `/api/v1/recruitment-rounds/.../questions`. Those endpoints are not implemented or defined by the current round contract. |
| Application form | `DynamicApplicationForm` is a prototype with sample student/questions and local form/review/success states. It is not mounted and does not submit to the backend. |

A Spring Boot SPA forward for `/clubs/**` or `/dashboard/**` does not create a corresponding frontend screen.

## Development

Use Node 22.14+ on the Node 22 line. Start the backend and PostgreSQL using the [root guide](../README.md#development-setup), then run from `frontend/`:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. [vite.config.ts](vite.config.ts) proxies `/api` to `http://localhost:8080`; the backend must be running for login. `/actuator/health` is accessed directly on port 8080.

For backend mock authentication, use the `dev` profile with `TU_AUTH_MODE=mock` and `student-demo` / `tu-clubhub-demo`. This creates a local user but does not grant committee access or verify student eligibility.

`AuthContext` also contains a separate browser-only mock enabled by `VITE_MOCK_AUTH=true` or `VITE_ENABLE_MOCK_AUTH=true`. It skips authentication requests and stores a fake user in `sessionStorage`; it does not create a backend session. Leave both unset for API integration and production builds. The current check is not restricted to Vite development mode.

## Scripts

| Command | Behavior |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | `tsc -b` followed by Vite; writes `dist/` |
| `npm run lint` | Oxlint |
| `npm test` | Node test runner for `tests/clubProfileValidation.test.ts` and `tests/recruitmentValidation.test.ts` |
| `npm run preview` | Preview built assets; this command does not start the backend |

There are no `typecheck` or `test:run` scripts. CI currently runs lint and build, but not `npm test`. Tailwind is loaded from `src/index.css` through the PostCSS plugin in `postcss.config.js`.

## Contracts to use when connecting features

- [Main API contract](../docs/api/API_v1.md) and [OpenAPI](../docs/api/openapi.yaml): auth, clubs, and application submission.
- [Recruitment contract](../docs/api/rounds.openapi.yaml): create/replace a round with its complete `questions` array; individual-question endpoints are not part of this contract.
- [Permission matrix](../docs/security/permission-matrix.md): authorization is enforced by the backend; UI role strings and hidden controls do not grant access.

Club profile updates use `ClubUpdateRequestDto`; category/tags are read-only, and blank optional values are sent as `null`. Public profile and open-round responses have their own DTOs and should not be replaced with the mock `ClubDetailData` shape.

Application submission uses `motivation`, `answers[]`, and `links[]` from API Contract §11. The prototype's `reason` and single `documentUrl` fields still need mapping, real question IDs, validation limits, and a client. The submission endpoint itself remains pending; a local success screen does not indicate database persistence.
