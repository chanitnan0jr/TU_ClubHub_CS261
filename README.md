# TU-ClubHub

TU-ClubHub is a planned web platform for Thammasat University students to discover clubs, follow recruitment announcements, apply for membership, and track application outcomes. Club committees will manage club profiles and recruitment rounds, while central staff will view university-wide summaries.

> **Project status:** This repository contains project documentation and design proposals, a React + TypeScript Vite frontend starter, and a Spring Boot backend scaffold with PostgreSQL and Flyway configuration. The application and full-stack development setup are still in progress.

## Planned technology

| Area | Target |
|---|---|
| Frontend | React, TypeScript, Vite, and Tailwind CSS; client-rendered, feature-based SPA |
| Backend | Java 21 and Spring Boot 4.x; feature-based modular monolith |
| Database | PostgreSQL, Spring Data JPA, and Flyway |
| Authentication | TU Authentication API with server-side Spring Session JDBC and CSRF protection |
| API | REST JSON under `/api/v1`; frontend and backend share the same API contract |
| Delivery | Render Web Service and PostgreSQL; frontend build served by Spring Boot |

These are the current target choices from the architecture documents. Details may change as implementation progresses.

## Project documentation

| Document | Description |
|---|---|
| [Commit rules](COMMIT_RULES.md) | Conventional Commit format and project commit guidance |
| [API v1 contract](docs/api/API_v1.md) | Shared endpoint, session, CSRF, response, and error conventions |
| [OpenAPI specification](docs/api/openapi.yaml) | Machine-readable foundation API proposal |
| [System architecture](docs/architecture/system-architecture.md) | System boundaries, modules, security, workflows, and deployment target |
| [Scaffold context](docs/architecture/scaffold-context.md) | Foundation requirements, repository layout, and implementation scope |
| [Architecture diagram](docs/architecture/TU-ClubHub-Architecture.drawio) | Editable system architecture diagrams |
| [Database design](docs/database/TU-ClubHub-ERD-Updated.dbml) | Proposed PostgreSQL domain model; this DBML is not an executable migration |

## Foundation scope

The first implementation milestone is intended to provide a runnable frontend and backend, PostgreSQL migrations, a minimal health endpoint, session login/logout/current-user endpoints, and a club-detail page backed by the database. Mock TU authentication is restricted to local and test environments. The club-detail page is expected to use the real backend and database rather than a mock API.

Full application submission, review and result publication, offer confirmation or decline, membership workflows, dashboards, and notifications are later product work. Their policies and API schemas still need to be agreed before implementation.

## Development setup

### Full-Stack Local Execution (Docker Compose)

The recommended way to run the entire system (Application + PostgreSQL database) locally is using Docker Compose:

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Build and run all services:
   ```sh
   docker compose up --build
   ```
3. Open `http://localhost:8080` in your browser. For comprehensive options and clean-slate resets, see the [Local Demonstration Guide](docs/deployment/local-demo.md).

### Standalone Local Development

If you prefer to run services individually:

- **Frontend:** From `frontend/`, run `npm install` and `npm run dev` to start the Vite development server on `http://localhost:5173`.
- **Backend:** From `backend/`, ensure PostgreSQL is running (or run `docker compose up -d db`), set `DB_PASSWORD`, and start Spring Boot:
  ```sh
  cd backend
  export DB_PASSWORD=your_password
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
  ```

The `dev` profile enables Flyway migrations and validates the schema with Hibernate.

## Contract changes

When adding an endpoint, update the Markdown API contract and OpenAPI specification together with the backend DTO and frontend types. Backend authorization remains authoritative; frontend route guards and role displays are for user experience only.

TU credentials and application keys must remain on the server. The browser must not call the TU Authentication API directly. The platform stores HTTPS document and image URLs; it does not upload files or automatically fetch remote content.
