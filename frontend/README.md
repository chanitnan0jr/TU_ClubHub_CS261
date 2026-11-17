# TU-ClubHub frontend

React 19, TypeScript 6, Vite 8, Tailwind CSS 4 (`@tailwindcss/postcss`), React Router 7, and `lucide-react`. Dependency versions are recorded in [package.json](package.json) and the lockfile.

## Current screens and routes

Routes live in [src/app/AppRoutes.tsx](src/app/AppRoutes.tsx), under the path prefixes the backend forwards to `index.html` (`/login`, `/clubs/**`, `/profile/**`, `/me/applications/**`, `/dashboard/**`, and `/admin/dashboard`). Positive decimal IDs are checked with `isValidId` before loading route views; malformed IDs render `NotFoundPage` without calling the API.

| Route | Access | Component / Behavior |
|---|---|---|
| `/`, `/clubs` | Public | `ClubSearchPage` reads `GET /api/v1/public/clubs`, categories, and earliest open recruitment rounds (`clubRecruitment.ts`), with search, category, and open-recruitment filters plus last-close timestamps. |
| `/open-calls` | Public | Redirects to `/clubs`. |
| `/login` | Public | `LoginPage` + `Login`: authenticates with session/CSRF and redirects to safe same-site `next` paths with `LoginSuccessNotice`. |
| `/dashboard` | Public / Session | `HomePage`: shows clubs the signed-in user manages (linking to `/clubs/:clubId/manage`) or the login/discovery entry point for visitors. |
| `/clubs/:clubId` | Public | `ClubDetailRoutePage` -> `ClubDetailPage`: reads `GET /api/v1/public/clubs/{id}` and `/recruitment-rounds`, renders club profile, contacts/map, activity gallery, and open-round apply actions. |
| `/clubs/:clubId/rounds/:roundId/apply` | Session | `ApplicationRoutePage` -> `DynamicApplicationForm`: loads `GET /api/v1/rounds/{roundId}/application-form`, shares `ApplicantIdentityGrid` & `<Field>`, validates answers/HTTPS links (`utils/validation.ts`), previews, and submits via `POST /api/v1/rounds/{roundId}/applications`. |
| `/clubs/:clubId/rounds/:roundId/apply/result` | Session | `ApplicationResultRoutePage`: displays submission confirmation receipt and links to `/profile/applications` or `/`. |
| `/me/applications`, `/profile/applications` | Session | `MyApplicationsPage`: lists applicant submissions (`GET /api/v1/me/applications`) with status tabs, year filters, and `StatusBadge` / `StatusPill` badges. |
| `/me/applications/:applicationId`, `/profile/applications/:applicationId` | Session | `MyApplicationDetailRoutePage` -> `MyApplicationDetailPage`: displays submitted answers, links, status history timeline, and confirm/decline offer actions (`ConfirmDialog`; calls `POST /api/v1/me/applications/{id}/confirm|decline`, which has no backend handler yet). |
| `/clubs/:clubId/manage` | Session (Committee) | `ClubManageRoutePage` inside `CommitteeLayout`: overview shortcuts, term-filtered recruitment metrics, and recent rounds summary. |
| `/clubs/:clubId/edit` | Session (Committee) | `ClubEditRoutePage` -> `ClubProfileForm`: loads profile/categories/tags via `useApiResource` and saves updates with `PUT /api/v1/clubs/{clubId}`. |
| `/clubs/:clubId/rounds` | Session (Committee) | `RoundListRoutePage` -> `RoundListPage`: paginated committee round list with `PUBLISH` / `CLOSE` actions and confirmation dialogs. |
| `/clubs/:clubId/rounds/new` | Session (Committee) | `RoundCreateRoutePage` -> `RecruitmentRoundForm`: creates a draft or publishes immediately. |
| `/clubs/:clubId/rounds/:roundId/edit` | Session (Committee) | `RoundEditRoutePage` -> `RecruitmentRoundForm`: edits draft rounds (`PUT` with optimistic `version`). |
| `/clubs/:clubId/rounds/:roundId/questions` | Session (Committee) | `QuestionManagementRoutePage` -> `QuestionManagementPage`: adds, edits, reorders, and deletes screening questions with `409 QUESTION_HAS_ANSWERS` handling. |
| `/clubs/:clubId/applications` | Session (Committee) | `CommitteeApplicationsPage`: filters club applications by round/status, records batch decisions, and opens `PublishResultsModal` (`PRESIDENT`). |
| `/clubs/:clubId/applications/:applicationId` | Session (Committee) | `CommitteeApplicationDetailPage`: views applicant profile, answers, validated HTTPS document links (`isValidHttpsUrl`), and individual evaluation snapshot/decision. |
| `/admin/dashboard` | Session (`ADMIN`) | `CentralDashboardPage` (`AdminGuard`): university-wide club/application metrics (`StatCards`), category/top-club charts (`DataCharts`), filterable table, and CSV export. |

## Shared UI, layout, and API client

- **Layouts**: `PublicLayout` (sticky public navigation header, optional `fullBleed` mode, and `WIDE_CONTAINER_CLASS = 'mx-auto w-full max-w-[1680px] px-4 sm:px-8 lg:px-12 xl:px-16'`) and `CommitteeLayout` (left sidebar + `WIDE_CONTAINER_CLASS` workspace).
- **UI Primitives** (`src/components/ui/`): `Breadcrumbs`, `Button`, `ConfirmDialog`, `EmptyState`, `Field` (`hintAlign`), `ImageUrlField`, `PageHeaderBanner`, `SectionCard`, `StatusBadge` / `StatusPill`, `StickySaveBar`, `classes.ts`; icons come directly from `lucide-react`.
- **HTTP & Resource Hooks**: `src/lib/api.ts` centralizes JSON fetch, CSRF header management (`X-CSRF-TOKEN`), `ApiError`, `describeApiError`, and auth failure notifications; `src/hooks/useApiResource.ts` handles keyed async loading, stale-response cancellation, and reloads.

## Development

Use Node 22.14+ on the Node 22 line. Start the backend and PostgreSQL using the [root guide](../README.md#development-setup), then run from `frontend/`:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. [vite.config.ts](vite.config.ts) proxies `/api` to `http://localhost:8080`; `/actuator/health` is accessed directly on port 8080.

For backend mock authentication, use the `dev` profile with `TU_AUTH_MODE=mock` and `student-demo` or `applicant-demo` (password `tu-clubhub-demo`).

For quick multi-role testing in local development, set `DEV=true` on the backend (with `TU_AUTH_MODE=mock` and `dev` profile). The self-contained `src/features/dev/DevRoleSwitcherPill.tsx` component (mounted in `src/App.tsx`) probes `GET /api/v1/auth/dev/accounts`, stays hidden when the endpoint returns `404`, and switches real backend sessions via `POST /api/v1/auth/dev/switch` + `AuthContext.establishSession`. Removing `src/features/dev/` and the `<DevRoleSwitcherPill />` tag in `src/App.tsx` cleanly strips the frontend feature.

### Login confirmation (issue #78)

`AuthContext` records a fresh-login event only after the explicit login flow has loaded the current session. `App` mounts `LoginSuccessNotice` outside the routes: its pre-mounted `role="status"`, `aria-live="polite"`, `aria-atomic="true"` region receives the confirmation after leaving `/login`. The message uses a dismissible notification banner with a keyboard-accessible close button and stays until dismissed, logged out, or authentication fails. It is never persisted in storage or navigation state.

## Scripts

| Command | Behavior |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | `tsc -b` followed by Vite; writes `dist/` |
| `npm run lint` | Oxlint |
| `npm test` | `tsx --test` runs every `tests/*.test.ts` file (unit and jsdom component tests) |
| `npm run test:task54:e2e` | Browser E2E verification script (`scripts/verify-task54-browser.mjs`) |
| `npm run preview` | Preview built assets; does not start the backend |

Tailwind CSS v4 and typography (`IBM Plex Sans Thai` + `Manrope` loaded in `index.html`) are configured in `src/index.css` via `@tailwindcss/postcss` in `postcss.config.js`.

## Contracts

- [Main API contract](../docs/api/API_v1.md) and [OpenAPI](../docs/api/openapi.yaml): auth, clubs, application form/submission, applicant history, confirm/decline (contract only; backend handler pending), committee review, selection results, and admin dashboard.
- [Recruitment contract](../docs/api/rounds.openapi.yaml): round and screening-question endpoints.
- [Permission matrix](../docs/security/permission-matrix.md): authorization is enforced by the backend; UI role strings and route guards are UX only.
