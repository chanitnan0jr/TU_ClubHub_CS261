# TU-ClubHub

TU-ClubHub is a web platform in development for Thammasat University students to discover clubs, apply for membership, and track results. Club committees manage profiles and recruitment; central staff reporting is planned.

> **Status reviewed: 2026-10-19.** Authentication, public club APIs, club profile updates, and recruitment write APIs have implementations. The main frontend currently provides login, account identity, and logout; the other feature components still need integration. The status below describes repository contents, not a deployment or test result.

## Current implementation

| Area | Present in the repository | Remaining work |
|---|---|---|
| Authentication | TU real/mock adapters; session login/logout/me, CSRF, 30-minute idle and 8-hour absolute expiry; connected login UI | Verify real TU access and map verified student status into `student_profiles` |
| Public clubs (US-02) | Public profile and paginated currently open rounds APIs backed by the database | Club-detail UI still uses mock data and is not mounted in the main app; club listing/search is absent |
| Club profile (US-06) | `PUT /api/v1/clubs/{clubId}` with committee guard; editor components and API client | `GET /api/v1/clubs/{clubId}` is contract-only; route integration, category/tag writes, and remaining permission checks |
| Recruitment (US-07) | Create, replace, publish, and close APIs with version checks; form component | Committee list/detail `GET`, `CANCEL`, self-review checks, and frontend integration |
| Questions (US-08) | Questions saved with round `POST`/`PUT`; question UI components | Frontend still targets unsupported per-question endpoints; align it with the round contract |
| Applications (US-03) | Submission contract, database tables, and a form prototype | Submission API/client and real question data; the prototype does not persist applications |
| Later workflows | Schema and design for review, results, membership, notifications, and reporting | Application history, decisions, confirmation/decline, Admin APIs, and dashboards |
| Runtime | Flyway migrations, health endpoint, Docker/Compose, and CI workflow | Deployment and verification of the selected release |

See the [permission matrix implementation gaps](docs/security/permission-matrix.md#9-สถานะ-implementation-และงานที่ต้องตามนโยบาย). An implemented endpoint does not mean the entire story or adopted authorization policy is complete.

## Technology in use

| Area | Repository configuration |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4; client-rendered SPA |
| Backend | Java 21, Spring Boot 4.1.1, Spring Security; feature packages in one application |
| Database | PostgreSQL; JPA and JDBC repositories; Flyway V1 business schema and V3 session tables |
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
| [Main OpenAPI specification](docs/api/openapi.yaml) | Authentication, clubs, health, and the pending application-submission endpoint |
| [Recruitment OpenAPI specification](docs/api/rounds.openapi.yaml) | Round/question writes plus pending committee reads and cancellation |
| [System architecture](docs/architecture/system-architecture.md) | System boundaries, modules, security, workflows, and deployment target |
| [Permission matrix](docs/security/permission-matrix.md) | Adopted Student, Club Committee, and Admin permissions; Active status, term dates, self-review, and implementation gaps |
| [Repository context](docs/architecture/scaffold-context.md) | Current layout, integration gaps, configuration, and next work |
| [Architecture diagram](docs/architecture/TU-ClubHub-Architecture.drawio) | Editable system architecture diagrams |
| [Database design](docs/database/TU-ClubHub-ERD-Updated.dbml) / [migrations](backend/src/main/resources/db/migration) | Domain model and executable schema; migrations are authoritative |
| [User stories](docs/stories) / [sequence diagrams](docs/diagrams/sequence) | Acceptance requirements and Happy path exchanges, including pending workflows |
| [Local demonstration guide](docs/deployment/local-demo.md) | Compose modes, demo login, persistence, and reset instructions |
| [Frontend guide](frontend/README.md) | Current screens, components, and API integration gaps |
| [Test reports and handoffs](docs/testing) | Historical results for the revision/date recorded in each report |

## Development setup

### Full-Stack Local Execution (Docker Compose)

Use Docker Engine/Desktop with Compose V2. Run from the repository root:

1. On first setup, copy `.env.example` to `.env`; keep an existing local configuration:
   ```sh
   cp .env.example .env
   ```
2. Build and run all services:
   ```sh
   docker compose up --build
   ```
3. Open `http://localhost:8080`. In `dev` with `TU_AUTH_MODE=mock`, log in with `student-demo` / `tu-clubhub-demo`. Health is available at `http://localhost:8080/actuator/health`. A fresh database has no clubs; run `scripts/seed-dev-data.sh` once the app has started to load local demo data (see the [local demo guide](docs/deployment/local-demo.md)).

Migrations create the schema without demo clubs, memberships, or committee assignments. Login provisions a local user, not an eligible student profile or committee permissions. The club/profile/recruitment screens are not yet reachable through the main app. See the [local guide](docs/deployment/local-demo.md) for Compose options and resets.

### Standalone Local Development

Use Java 21 and Node 22.14+ on the Node 22 line. Start PostgreSQL from the root:

```sh
docker compose up -d db
```

In one terminal, start the backend. This password matches `.env.example`; use your configured `POSTGRES_PASSWORD` if changed:

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

Open `http://localhost:5173`; Vite proxies `/api` to `http://localhost:8080`. Use the backend URL directly for `/actuator/health`. The `dev` profile runs Flyway and Hibernate schema validation. Spring Boot does not automatically load the root `.env` file.

### Configuration

| Variable | Current use |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST_PORT` | Compose database settings; host port defaults to 5432 |
| `DB_PASSWORD` | Password for direct JVM startup with the `dev` profile |
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Override the JDBC connection when database name, host port, or credentials differ; Compose supplies these to containers |
| `SPRING_PROFILES_ACTIVE` | Compose defaults to `dev`; production must use real TU authentication |
| `PORT` | Spring HTTP port; keep 8080 with the current Compose `app` port mapping |
| `TU_AUTH_MODE` | `mock` for dev/test, `real` for TU integration |
| `TU_AUTH_ENDPOINT_URL`, `TU_AUTH_APPLICATION_KEY` | Required in real mode; server environment only |
| `TU_AUTH_CONNECT_TIMEOUT`, `TU_AUTH_READ_TIMEOUT` | Backend defaults: `3s` and `5s` |
| `SPRING_SESSION_TIMEOUT` | Idle session timeout; default `30m`. Absolute expiry is fixed at 8 hours in code |

### Available checks and CI

Frontend scripts are `dev`, `build`, `test`, `lint`, and `preview`. `build` runs TypeScript checking before Vite; there are no separate `typecheck` or `test:run` scripts. The current `test` script runs every `frontend/tests/*.test.ts` unit test (validation, API client and form/routing helpers); there are no component or browser tests.

[CI](.github/workflows/ci.yml) runs frontend `npm ci`, `npm run lint`, and `npm run build`, plus backend `./mvnw clean verify` and uploads test/JaCoCo reports. It does not currently invoke frontend `npm test`. Backend tests use H2 and PostgreSQL; the `seedtest` profile covers migrations/public data, and recruitment integration tests also use PostgreSQL. Documentation-only changes are excluded by the workflow path filters.

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
