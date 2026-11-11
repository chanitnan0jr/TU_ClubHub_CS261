# TU-ClubHub

TU-ClubHub is a web platform in development for Thammasat University students to discover clubs, apply for membership, and track results. Club committees manage profiles and recruitment; central staff reporting is planned.

> **Status reviewed: 2026-10-29.** Authentication, public club APIs, club profile updates, recruitment round writes, per-question management, and application submission APIs have implementations. The main frontend routes login, club detail, club editing, round creation, and question management; the application form still needs integration. The status below describes repository contents, not a deployment or test result. The [Sprint 2 Task74 analysis and review packet](docs/architecture/task74-sprint2-analysis.md) records user decisions and remains Draft / Pending Team Review; it does not establish team approval or a completed workflow.

## Current implementation

| Area | Present in the repository | Remaining work |
|---|---|---|
| Authentication | TU real/mock adapters; session login/logout/me, CSRF, 30-minute idle and 8-hour absolute expiry; every authenticated request rechecks the account and a suspended account loses its session (`403 ACCOUNT_NOT_ALLOWED`); login creates/updates `student_profiles` from documented TU status values (unknown → `UNKNOWN`); public routes are one method + path list; connected login UI | Verify with real TU access (student-profile sync has passed automated tests only) and read the current global role from the database |
| Public clubs (US-01 / US-02) | `GET /api/v1/public/clubs` search/filter/pagination API (`q`, `categoryId`, `tagId`, `recruitmentStatus`, `sort`), `GET /api/v1/public/club-categories`, `GET /api/v1/public/interest-tags`, public profile, and paginated currently open rounds APIs backed by the database; `/clubs/:clubId` shows their data | Frontend directory integration (`Task63`) and application form connection |
| Club profile (US-06) | `PUT /api/v1/clubs/{clubId}` with committee guard, rechecked inside the service transaction; `/clubs/:clubId/edit` prefills from the public profile and saves | `GET /api/v1/clubs/{clubId}` is contract-only; category/tag writes |
| Recruitment (US-07) | Create, replace, publish, and close APIs with version checks and the self-review restriction; responses follow the `Round` schema, including questions; `/clubs/:clubId/rounds/new` creates and optionally publishes a round | Committee list/detail `GET`, `CANCEL` (effective `PRESIDENT`), and publishing a draft from the UI after editing its questions |
| Questions (US-08) | Question writes enforce committee/self-review guards. Answered content and positions are protected by `409 RESOURCE_CONFLICT` with `reason: QUESTION_HAS_ANSWERS`, including whole-round replacement. Unanswered existing questions remain editable in mixed open drafts; creation/full replacement still require no applications. The question page shows the specific conflict alert | Team review of the limited Task51 mixed-draft exception; see [test report](docs/testing/task51-answered-question-lock.md) |
| Applications (US-03) | `GET /api/v1/rounds/{roundId}/application-form`; `POST /api/v1/rounds/{roundId}/applications` and Task52 `POST /api/v1/clubs/{id}/applications` (required body `roundId`) share one atomic submission transaction, session/CSRF checks, `SUBMITTED` history and duplicate protection; see [contract §11.1](docs/api/API_v1.md#111-club-scoped-submission-task52) | Task52 adds no upload system, seat quota or frontend route migration; PO/team review of the club-scoped addition remains pending |
| Committee review (US-09 / Task65) | `GET /api/v1/clubs/{id}/applications` and `GET /api/v1/clubs/{id}/applications/{appId}`; current club/term grants, self-review exclusion before pagination/count, dedicated DTOs without internal notes; [contract §13](docs/api/API_v1.md#13-committee-application-reads-task65) | Task66 UI integration, PO/team review and release CI |
| Admin dashboard (US-10 / Task71 & Task72) | `GET /api/v1/admin/dashboard/stats` with database `ADMIN` recheck, CTE aggregation without join multiplication, and `/admin/dashboard` UI (`CentralDashboardPage`) | End-to-end verification with Task69/Task70 confirmation flow |
| Admin assignments (Task78) | Session/CSRF Admin create/read/replace/revoke APIs; fresh DB role, expected versions, PostgreSQL locks, retained history and durable audit; [contract](docs/api/API_v1.md#admin-committee-assignments-task78) and [local test report](docs/testing/task78-assignment-concurrency.md) | Team review, deployment, Admin UI and membership bootstrap; dashboards remain separate |
| Later workflows | Schema and design for results, membership, and notifications | Decisions, result publication, and membership confirmation/decline |
| Runtime | Flyway migrations, health endpoint, Docker/Compose, and CI workflow | Deployment and verification of the selected release |

See the [permission matrix implementation gaps](docs/security/permission-matrix.md#9-สถานะ-implementation-และงานที่ต้องตามนโยบาย). An implemented endpoint does not mean the entire story or adopted authorization policy is complete.

## Technology in use

| Area | Repository configuration |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4; client-rendered SPA |
| Backend | Java 21, Spring Boot 4.1.1, Spring Security; feature packages in one application |
| Database | PostgreSQL; JPA and JDBC repositories; Flyway V1 business schema, V3 session tables, V4 assignment integrity/audit, and V5 club name search trigram index |
| Authentication | TU Authentication API with server-side Spring Session JDBC and CSRF protection |
| API | REST JSON under `/api/v1`; Markdown and OpenAPI contracts include implementation status |
| Local delivery | Root Dockerfile embeds the frontend in Spring Boot; Compose uses PostgreSQL 17 |
| Deployment target | Render Web Service and PostgreSQL; no deployment is established by this README |

Dependency versions are recorded in [frontend/package.json](frontend/package.json), its lockfile, and [backend/pom.xml](backend/pom.xml). Docker builds use Node 22.14 and Java 21. CI provisions PostgreSQL 18; local Compose uses 17.

## Project documentation

| Document | Description |
|---|---|
| [Commit rules](COMMIT_RULES.md) | Conventional Commit format and project commit guidance |
| [API v1 contract](docs/api/API_v1.md) | Shared endpoint, session, CSRF, response, and error conventions |
| [Main OpenAPI specification](docs/api/openapi.yaml) | Authentication, clubs, health, the application form and submission, plus the pending Sprint 2 contracts |
| [Recruitment OpenAPI specification](docs/api/rounds.openapi.yaml) | Round/question writes and committee reads, plus pending cancellation |
| [System architecture](docs/architecture/system-architecture.md) | System boundaries, modules, security, workflows, and deployment target |
| [Sprint 2 Task74 artefacts](docs/architecture/task74-sprint2-analysis.md) | Draft review packet linking the business flow, state machine, permissions, rule index, decisions, Story/AC traceability, QA scenarios, and approval checklist |
| [Permission matrix](docs/security/permission-matrix.md) | Adopted Student, Club Committee, and Admin permissions; Active status, term dates, self-review, and implementation gaps |
| [Repository context](docs/architecture/scaffold-context.md) | Current layout, integration gaps, configuration, and next work |
| [Architecture diagram](docs/architecture/TU-ClubHub-Architecture.drawio) | Editable system architecture diagrams |
| [Database design](docs/database/TU-ClubHub-ERD-Updated.dbml) / [migrations](backend/src/main/resources/db/migration) | Domain model and executable schema; migrations are authoritative |
| [User stories](docs/stories) / [sequence diagram index](docs/diagrams/README.md) | Acceptance requirements and exchanges for Sprint 1 and Draft Sprint 2 workflows, with pending contracts and dependencies marked |
| [Local demonstration guide](docs/deployment/local-demo.md) | Compose modes, demo login, persistence, and reset instructions |
| [Frontend guide](frontend/README.md) | Current screens, components, and API integration gaps |
| [Test reports and handoffs](docs/testing) | Historical results for the revision/date recorded in each report |

## Development setup

### Full-Stack Local Execution (Docker Compose)

Use Docker Engine/Desktop with Compose V2. Run from the repository root:

1. On first setup, copy `.example.env` to `.env`; keep an existing local configuration:
   ```sh
   cp .example.env .env
   ```
2. Build and run all services:
   ```sh
   docker compose up --build
   ```
3. Open `http://localhost:8080`. In `dev` with `TU_AUTH_MODE=mock`, log in with `student-demo` or `applicant-demo` (password `tu-clubhub-demo`). Health is available at `http://localhost:8080/actuator/health`.
4. A fresh database has no clubs. Once the app has started (Flyway creates the tables), load the dev-only demo data in another terminal:
   ```sh
   scripts/seed-dev-data.sh
   ```
   It runs [`V2__seed_test_data.sql`](backend/src/test/resources/db/migration/V2__seed_test_data.sql) inside the `tu-clubhub-db` container: demo clubs, fictional users, and `student-demo` as president of one club with a draft round and questions. It is safe to run again, and prints the club and question-page URLs to open. The script does not read `.env`; if you changed `POSTGRES_USER` or `POSTGRES_DB`, export them first (`DB_CONTAINER` overrides the container name).

Migrations create the schema without demo clubs, memberships, or committee assignments. Login provisions a local user and, for TU student accounts, a student profile from the TU status; it grants no memberships or committee permissions. Club detail, club editing, and question management are routed in the main app (see the [frontend guide](frontend/README.md)); the round and application forms are not. See the [local guide](docs/deployment/local-demo.md) for Compose options and resets.

### Mock accounts for local testing

With `SPRING_PROFILES_ACTIVE=dev` and `TU_AUTH_MODE=mock`, only these accounts can log in. Both use the password `tu-clubhub-demo`:

| Username | Role after `scripts/seed-dev-data.sh` | Use it to test |
|---|---|---|
| `student-demo` | Student, `USER`, president of ชมรมเขียนโปรแกรม (`/clubs/3` on a fresh seed) | Committee pages: club profile, recruitment rounds, screening questions |
| `applicant-demo` | Student, `USER`, member of no club | Applying to a club (`student-demo` cannot apply to its own club) |

The other seeded users, including `seed_admin`, are data only and cannot log in. To test a different role, change a mock account with `scripts/dev-role.sh` (dev only; log in once with the account first so its user row exists):

```sh
scripts/dev-role.sh list                                  # every account with its system and committee roles
scripts/dev-role.sh admin applicant-demo                  # system role ADMIN, e.g. for the admin dashboard
scripts/dev-role.sh user applicant-demo                   # back to USER
scripts/dev-role.sh committee applicant-demo 1 PRESIDENT  # committee member of club 1 (COMMITTEE is the default)
```

After `admin` or `user`, log out and in again: the session keeps the role it had at login. Committee roles apply on the next page load. Like the seed script, it uses `DB_CONTAINER`, `POSTGRES_USER` and `POSTGRES_DB` when set.

### Standalone Local Development

Use Java 21 and Node 22.14+ on the Node 22 line. Start PostgreSQL from the root:

```sh
docker compose up -d db
```

In one terminal, start the backend. This password matches `.example.env`; use your configured `POSTGRES_PASSWORD` if changed:

```sh
cd backend
export DB_PASSWORD=tu_clubhub_dev_secret
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

The backend's Flyway run creates the tables in the Compose `db` container, so `scripts/seed-dev-data.sh` loads the same demo data in this mode.

Open `http://localhost:5173`; Vite proxies `/api` to `http://localhost:8080`. Use the backend URL directly for `/actuator/health`. The `dev` profile runs Flyway and Hibernate schema validation. Spring Boot does not automatically load the root `.env` file.

### Configuration

| Variable | Current use |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST_PORT` | Compose database settings; host port defaults to 5432 |
| `DB_PASSWORD` | Password for direct JVM startup with the `dev` profile |
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Override the JDBC connection when database name, host port, or credentials differ; Compose supplies these to containers |
| `SPRING_PROFILES_ACTIVE` | Compose defaults to `dev`; production must use real TU authentication |
| `PORT` | Host port for the Compose `app` service (the container listens on 8080); Spring's HTTP port when run outside Compose |
| `TU_AUTH_MODE` | `mock` for dev/test, `real` for TU integration |
| `TU_AUTH_ENDPOINT_URL`, `TU_AUTH_APPLICATION_KEY` | Required in real mode; server environment only |
| `TU_AUTH_CONNECT_TIMEOUT`, `TU_AUTH_READ_TIMEOUT` | Backend defaults: `3s` and `5s` |
| `SPRING_SESSION_TIMEOUT` | Idle session timeout; default `30m`. Absolute expiry is fixed at 8 hours in code |

### Available checks and CI

Frontend scripts are `dev`, `build`, `test`, `lint`, and `preview`. `build` runs TypeScript checking before Vite; there are no separate `typecheck` or `test:run` scripts. The current `test` script runs every `frontend/tests/*.test.ts` unit test (validation, API client and form/routing helpers); there are no component or browser tests.

[CI](.github/workflows/ci.yml) runs frontend `npm ci`, `npm run lint`, `npm test`, and `npm run build`, plus backend `./mvnw clean verify` and uploads test/JaCoCo reports. Backend tests use H2 and PostgreSQL; the `seedtest` profile covers migrations/public data, and recruitment integration tests also use PostgreSQL. Documentation-only changes are excluded by the workflow path filters.

### Graphify code knowledge graph

Graphify is an optional local developer tool. Install the official `graphifyy`
package into a dedicated environment from the repository root (requires Python
3.10+ and [uv](https://docs.astral.sh/uv/)):

```sh
uv venv .venv-graphify
uv pip install --python .venv-graphify/bin/python 'graphifyy[sql]==0.9.92'
source .venv-graphify/bin/activate
graphify install --project --platform codex
```

Activate that environment in each new terminal before starting Codex. Restart
the Codex session after installation to discover the project skill, then invoke
`$graphify`. To build and query a code-only graph directly, without an API key:

```sh
graphify extract . --code-only --max-workers 2
graphify query "club profile"
```

The environment and generated `graphify-out/` directory are ignored by Git.
`.graphifyignore` excludes local credentials, agent files, and build artifacts.
To remove the integration, run `graphify codex uninstall --project` while the
environment is active, then remove the local `.venv-graphify/` and
`graphify-out/` directories if no longer needed.

## Contract changes

When adding an endpoint, update the Markdown API contract and OpenAPI specification together with the backend DTO and frontend types. Backend authorization remains authoritative; frontend route guards and role displays are for user experience only.

For contract-only work, mark implementation as pending. Update this README and the affected story/diagram when a handler or frontend connection is added. Test reports describe their recorded revision and are not evidence that later changes have passed.

The [permission matrix](docs/security/permission-matrix.md) is the authorization policy adopted on 2026-10-19. Committee permissions require an active account, student profile, club, membership, and an unrevoked assignment within `starts_at <= now < ends_at`. Only an effective `PRESIDENT` may publish selection results. Admin manages aggregate reporting and committee appointments without bypassing club permissions or self-review restrictions. The matrix records remaining implementation work; adopting the policy does not mean every workflow is available.

TU credentials and application keys must remain on the server. The browser must not call the TU Authentication API directly. The platform stores HTTPS document and image URLs; it does not upload files or automatically fetch remote content.
