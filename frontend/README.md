# TU-ClubHub frontend

React 19, TypeScript 6, Vite 8, and Tailwind CSS 4. Versions are recorded in [package.json](package.json) and the lockfile.

## Current screens and integration

Reviewed from source on 2026-10-21. The routing, club detail, club editor and question pages were also exercised in a browser against a local backend with seeded data; this is not a CI report.

Routes live in `src/app/AppRoutes.tsx`, under the path prefixes the backend forwards to `index.html` (`/login`, `/clubs/**`). A club or round ID in a URL must be a positive decimal number, otherwise the page shows "not found" without calling the API.

| Route | Access | Current behavior |
|---|---|---|
| `/` | Public | Shows the login form without a session. After login it shows the account ID/role, logout, and a launcher where you enter a club ID (and round ID), because no API lists a user's clubs or rounds yet. |
| `/login` | Public | Login form. After login it returns to the `next` path (same-site paths only), or `/`. |
| `/clubs/:clubId` | Public | `ClubDetailPage` reads `GET /api/v1/public/clubs/{id}` and `/recruitment-rounds` and shows only the fields they return. An unknown club shows "not found"; a failed load shows a retry button instead of placeholder data. The apply action opens the session-protected form when a round is available. |
| `/clubs/:clubId/rounds/:roundId/apply` | Session | Loads the applicant form and questions from `GET /api/v1/rounds/{roundId}/application-form`, validates answers/HTTPS document links, reviews the submission, and posts to `POST /api/v1/rounds/{roundId}/applications`. The form-load endpoint is not implemented by the backend yet. |
| `/profile/applications` | Session | Placeholder destination after successful submission. Application history is not connected because the US-04 API is not implemented. |
| `/clubs/:clubId/edit` | Session | `ClubEditFormContainer` is prefilled from the public profile, because there is no committee `GET /api/v1/clubs/{clubId}`, and saves with `PUT`. Blank optional fields are sent as `null`. A non-committee user gets the backend's 403. A club that is not `ACTIVE` cannot be loaded. |
| `/clubs/:clubId/rounds/new` | Session | `RoundCreateRoutePage` creates the round with its questions through `POST /api/v1/clubs/{clubId}/rounds` and, for **บันทึกและเผยแพร่**, publishes it with `PATCH … {action: PUBLISH, version}`. A draft opens the questions page; it cannot be published later from the UI until a round read API exists. The form has no capacity field, because rounds have no seat limit. |
| `/clubs/:clubId/rounds/:roundId/questions` | Session | `QuestionManagementPage` uses the question APIs with session/CSRF. Open DRAFTs allow edits/deletes of unanswered existing questions, even with other answered questions. Answered content and positions stay fixed; adding questions still requires no applications. A 409 `QUESTION_HAS_ANSWERS` shows a specific alert, preserves the row and clears stale success messages; other conflicts retain their fallback. Applicant counts are not exposed. |

Components without a route yet:

| Area | Current behavior |
|---|---|
| Authentication | `AuthContext` calls the `csrf`, `login`, `me`, and `logout` endpoints under `/api/v1/auth`, sending cookies and CSRF for writes. |
| Recruitment round form | `RecruitmentRoundForm` is routed at `/clubs/:clubId/rounds/new` (below). Editing an existing round is not wired, because the backend has no round list or get yet. |
| Application form | `DynamicApplicationForm` loads the form and questions from `GET /api/v1/rounds/{roundId}/application-form`, validates and submits to the real submission API, then navigates to `/clubs/:clubId/rounds/:roundId/apply/result` with the submission receipt. The US-04 history route is currently a clear placeholder. No file uploads are supported by the API contract; document links are HTTPS URLs. |
| Club profile form | `src/ClubProfileForm.tsx` is not used by any route. |

`/dashboard/**` and `/profile` are forwarded by the backend but have no frontend screen.

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
| `npm test` | `tsx --test` runs every `tests/*.test.ts` file, including application-form component tests with jsdom as well as validation, API client, club, question, and routing tests. |
| `npm run preview` | Preview built assets; this command does not start the backend |

There are no `typecheck` or `test:run` scripts. CI runs lint, `npm test`, and build. Tailwind is loaded from `src/index.css` through the PostCSS plugin in `postcss.config.js`.

## Contracts to use when connecting features

- [Main API contract](../docs/api/API_v1.md) and [OpenAPI](../docs/api/openapi.yaml): auth, clubs, and application submission.
- [Recruitment contract](../docs/api/rounds.openapi.yaml): create/replace a round with its complete `questions` array; the individual-question endpoints under `/api/v1/rounds/{roundId}/questions` are defined in the same file.
- [Permission matrix](../docs/security/permission-matrix.md): authorization is enforced by the backend; UI role strings and hidden controls do not grant access.

Club profile updates use `ClubUpdateRequestDto`; category/tags are read-only, and blank optional values are sent as `null`. Public profile and open-round responses have their own DTOs; `ClubDetailData` is built from them in `clubService.ts`.

Application submission uses `motivation`, `answers[]`, and `links[]` from API Contract §11. The actual form route loads questions from the implemented backend application-form endpoint and posts to the submission endpoint. After a successful submission, the responsive result screen links to `/profile/applications`; that destination remains a placeholder until the US-04 history API and list UI are implemented.
