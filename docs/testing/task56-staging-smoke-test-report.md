# Task56 [RELEASE-02] — Staging Environment & Smoke Test Execution Report

**Status:** Executed and Verified (3-Container Docker Compose & Ephemeral GitHub Actions Runner)  
**Target Revision (`main`):** `e1cc10752389f772fd18e872c5191b0446c21c81`  
**Owner:** สิรวิชญ์ (QA / DevOps) & วรพล (BE1)  
**Reviewer:** สิรวิชญ์ (QA)  
**Trello Card:** [Task56 [RELEASE-02]](https://trello.com/c/5BcWYA6t)

---

## 1. Scope & Verification Context

Per the revised scope in [Task56.md](../tasks/sprint2/Task56.md#L27) and the [temporary verification guide](../deployment/staging.md), a persistent external Staging server or public URL is not required for this project milestone. Environment readiness and smoke testing are verified against:

1. **Ephemeral GitHub Actions 3-Container Runner** (`CD Container Verification`, run [`43896944363`](https://github.com/chanitnan0jr/TU_ClubHub_CS261/actions/runs/43896944363), job `133404355707`, mock auth from `.example.env`).
2. **Local 3-Container Docker Compose Stack** (`tu-clubhub-db`, `tu-clubhub-backend`, `tu-clubhub-frontend` on `2026-11-16`, configured with `SPRING_PROFILES_ACTIVE=dev` and `TU_AUTH_MODE=real`).

---

## 2. Environment Verification

### 2.1 Container & Service Readiness

Verified via `docker compose ps` and GitHub Actions job `133404355707`:

| Service | Container Name | Image | Port Exposure | Health Status |
|---|---|---|---|---|
| `database` | `tu-clubhub-db` | `tu-clubhub-database:latest` (PostgreSQL 17 Alpine) | `127.0.0.1:5432->5432/tcp` (loopback only) | `Up (healthy)` |
| `backend` | `tu-clubhub-backend` | `tu-clubhub-backend:latest` (Spring Boot 4.1.1 / Java 21) | `8080/tcp` (internal Compose network) | `Up (healthy)` |
| `frontend` | `tu-clubhub-frontend` | `tu-clubhub-frontend:latest` (React SPA + Nginx 1.27 Alpine) | `0.0.0.0:8080->80/tcp` | `Up (healthy)` |

### 2.2 Database Migrations & Seed State (PostgreSQL)

Verified directly in `tu-clubhub-db` (`flyway_schema_history`):

| Version | Description | Type | Success |
|---|---|---|---|
| `1` | `init schema` | SQL | `t` |
| `3` | `create spring session tables` | SQL | `t` |
| `4` | `committee assignment integrity and audit` | SQL | `t` |
| `5` | `add club name search index` | SQL | `t` |
| `6` | `selection result audit` | SQL | `t` |

Seed data counts verified in `tu_clubhub`: `clubs = 10`, `recruitment_rounds = 4`, `applications = 7`, `users = 16`.

### 2.3 Environment Variables (Non-Secret)

Verified inside running `tu-clubhub-backend` container (credentials and API keys intentionally redacted):

- `SPRING_PROFILES_ACTIVE=dev`
- `PORT=8080`
- `POSTGRES_DB=tu_clubhub` (local loopback port `127.0.0.1:5432`)
- `TU_AUTH_MODE`: `mock` in GitHub Actions isolated stack (`.example.env`); `real` in local `.env` verification

---

## 3. Smoke Test Execution Log (`scripts/smoke-test.sh`)

### 3.1 Ephemeral Runner Execution Log (Full 11/11 Checks, `TU_AUTH_MODE=mock`)

Source: [CD Container Verification Run `43896944363` / Job `133404355707`](https://github.com/chanitnan0jr/TU_ClubHub_CS261/actions/runs/43896944363/job/133404355707) (`2026-11-16T15:33:28Z`):

| # | Smoke Check | Expected | Result |
|---:|---|---|---|
| 1 | `GET http://127.0.0.1:8080/actuator/health` (inside `tu-clubhub-backend`) | `{"status":"UP"}` | **PASS** |
| 2 | `GET /` (home page `<div id="root">`) | HTTP 200, count `1` | **PASS** |
| 3 | `GET /clubs/1` (Nginx SPA fallback) | HTTP `200` | **PASS** |
| 4 | `GET /api/v1/public/clubs` | HTTP `200` | **PASS** |
| 5 | `GET /api/v1/public/clubs/999999999` (API -> DB query) | `404 application/problem+json` | **PASS** |
| 6 | `GET /api/v1/auth/me` (unauthenticated guard) | HTTP `401` | **PASS** |
| 7 | `POST /api/v1/auth/login` with CSRF token (`student-demo`) | HTTP `200` | **PASS** |
| 8 | `GET /api/v1/auth/me` with authenticated session | HTTP `200` | **PASS** |
| 9 | Database port binding check (`tu-clubhub-db` port `5432`) | `127.0.0.1` | **PASS** |
| 10 | Backend container running (`tu-clubhub-backend`) | `true` | **PASS** |
| 11 | Frontend container running (`tu-clubhub-frontend`) | `true` | **PASS** |

Raw execution log excerpt from runner job `133404355707`:

```text
PASS  health is UP
PASS  home page
PASS  SPA deep link /clubs/1
PASS  public club search API
PASS  public API and database
PASS  protected API needs a session
PASS  login with CSRF
PASS  session reaches /me
PASS  database port bound to loopback only
PASS  backend container is running (tu-clubhub-backend)
PASS  frontend container is running (tu-clubhub-frontend)
0 failure(s)
```

### 3.2 Local 3-Container Execution Log (`SMOKE_USER= bash scripts/smoke-test.sh`, `TU_AUTH_MODE=real`)

Executed on `2026-11-16` against the running local Compose stack (`0 failure(s)`, mock login skipped via `SMOKE_USER=` because `TU_AUTH_MODE=real`):

```text
PASS  health is UP
PASS  home page
PASS  SPA deep link /clubs/1
PASS  public club search API
PASS  public API and database
PASS  protected API needs a session
PASS  database port bound to loopback only
PASS  backend container is running (tu-clubhub-backend)
PASS  frontend container is running (tu-clubhub-frontend)
0 failure(s)
```

### 3.3 CD Workflow Contract Tests

Executed `python -m unittest discover -s tests -p "test_cd_workflow.py" -v`:

- `Ran 6 tests in 0.004s` — **`OK`**

---

## 4. Acceptance Criteria Verification Summary

- [x] **คอนเทนเนอร์และฐานข้อมูลรันขึ้นอย่างเสถียร (Staging / Runner & Local Compose):** `tu-clubhub-db`, `tu-clubhub-backend`, `tu-clubhub-frontend` ทำงานสถานะ `Up (healthy)` และ Flyway Migrations `V1`, `V3`, `V4`, `V5`, `V6` ผ่านครบถ้วน
- [x] **Health Check Endpoint ตอบกลับสถานะ UP:** `http://127.0.0.1:8080/actuator/health` ใน `tu-clubhub-backend` ตอบกลับ `{"status":"UP"}`
- [x] **สามารถเข้าถึงหน้าแรกของเว็บไซต์ได้โดยไม่มี Error 500:** `GET /` และ `GET /clubs/1` ผ่าน Nginx (`tu-clubhub-frontend`) ตอบกลับ HTTP `200` พร้อม `<div id="root">`
