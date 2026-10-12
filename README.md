# TU-ClubHub

TU-ClubHub is a planned web platform for Thammasat University students to discover clubs, follow recruitment announcements, apply for membership, and track application outcomes. Club committees will manage club profiles and recruitment rounds, while central staff will view university-wide summaries.

> **Project status:** This repository contains project documentation and design proposals, a React + TypeScript Vite frontend starter, and backend Maven Wrapper bootstrap files. The application and full-stack development setup are still being built.

## Planned technology

| Area | Target |
|---|---|
| Frontend | React, TypeScript, Vite, and Tailwind CSS; client-rendered, feature-based SPA |
| Backend | Java 21 and Spring Boot 4.x; feature-based modular monolith |
| Database | PostgreSQL, Spring Data JPA, and Flyway |
| Authentication | TU Authentication API with server-side Spring Session JDBC and CSRF protection |
| API | REST JSON under `/api/v1`; frontend and backend share the same API contract |
| Delivery | Render Web Service and PostgreSQL; frontend build served by Spring Boot |

These are target choices from the architecture documents. Dependency versions and executable setup instructions will be recorded when the application scaffold is added.

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

The `frontend/` directory contains an initial Vite starter with `dev`, `build`, `lint`, and `preview` scripts. From that directory, install the dependencies with `npm install` and start the development server with `npm run dev`. These commands are based on the current package manifest and have not been verified here. The backend currently contains only Maven Wrapper bootstrap files; `backend/pom.xml` and `compose.yaml` are not present, so the full-stack application is not runnable yet.

## Contract changes

When adding an endpoint, update the Markdown API contract and OpenAPI specification together with the backend DTO and frontend types. Backend authorization remains authoritative; frontend route guards and role displays are for user experience only.

TU credentials and application keys must remain on the server. The browser must not call the TU Authentication API directly. The platform stores HTTPS document and image URLs; it does not upload files or automatically fetch remote content.
