# Local Demonstration Guide with Docker Compose

This guide runs the current TU-ClubHub application and PostgreSQL locally using the checked-in Compose configuration. Reviewed on 2026-11-01 against release `v0.1.0-sprint1`; see [README](../../README.md#current-implementation) for feature status. Starting the containers does not make pending product workflows available.

---

## 1. Prerequisites

- **Docker Engine / Docker Desktop** with Docker Compose V2 support (`docker compose version`)
- **Port Availability**:
  - `8080`: Default application HTTP port
  - `5432`: PostgreSQL database port (bound to loopback `127.0.0.1` only)
  - `80`: Optional port if running the split Nginx profile

---

## 2. Environment Configuration

1. On first setup, copy `.env.example` to `.env`. Keep an existing local configuration:
   ```bash
   cp .env.example .env
   ```
2. Verify the default settings in `.env`:
   - `PORT=8080`: Application web port.
   - `SPRING_PROFILES_ACTIVE=dev`: Enables Flyway schema migration and local development defaults.
   - `TU_AUTH_MODE=mock`: Uses the internal mock TU Authentication provider (no external university API credentials required).
   - `POSTGRES_DB=tu_clubhub`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=tu_clubhub_dev_secret`

Compose supplies database credentials to the containers. Spring Boot started directly from a terminal does not load this `.env`; follow the [standalone setup](../../README.md#standalone-local-development). Keep `PORT=8080` with the current unified configuration: it uses `PORT` for Spring but maps the host port to container port 8080. To move the database host port, set `POSTGRES_HOST_PORT`; direct JVM connections must use the matching JDBC URL.

---

## 3. Starting the Full-Stack System

### Primary Mode: Unified Monolith (Recommended)

This mode builds React assets into the Spring Boot JAR, matching the planned Render packaging. It uses local `dev` settings; it is not a production deployment:

- **Database (`db`)**: PostgreSQL 17 Alpine container with persistent storage in named volume `postgres_data`.
- **Application (`app`)**: Spring Boot Java 21 container serving both REST API endpoints and embedded React frontend assets.

Execute from the repository root:
```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up --build -d
```

### Alternative Mode: Split Architecture (Separate Nginx Frontend)

If you wish to test with standalone Frontend and Backend services:

- **`db`**: PostgreSQL 17
- **`backend`**: Standalone Spring Boot
- **`frontend`**: Nginx Alpine serving React assets and proxying `/api` requests to backend

Execute:
```bash
docker compose --profile split up --build db backend frontend
```

Select these services explicitly: enabling the profile without a service list also starts the default `app` service. If switching from unified mode, stop its existing container with `docker compose stop app`. The split frontend is at `http://localhost`; Nginx proxies `/api`, not `/actuator`, and the backend port is internal to Compose.

---

## 4. Verifying the Deployment

1. **Check Service Health & Status**:
   ```bash
   docker compose ps
   ```
   In unified mode, expect `tu-clubhub-db` to be `healthy` and `tu-clubhub-app` to be `running`. In split mode, check `backend` and `frontend` instead of `app`.

2. **Access the Application**:
   - Open your web browser and navigate to: [http://localhost:8080](http://localhost:8080)
   - If using split mode: [http://localhost](http://localhost)
   - With `dev` + `TU_AUTH_MODE=mock`, two accounts share the password `tu-clubhub-demo`: `student-demo` (president of ชมรมเขียนโปรแกรม after seeding) and `applicant-demo` (a student with no memberships, for applying to that club).
   - After login the home page has a launcher that takes a club ID (and round ID). The club pages are `/clubs/{clubId}`, `/clubs/{clubId}/edit` and `/clubs/{clubId}/rounds/{roundId}/questions`. A fresh database has no clubs, so load the demo data first (step 3).
   - Unified health endpoint: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health).

3. **Database Migrations and Initial Data**:
   - Flyway automatically applies all database migrations (`V1__init_schema.sql`, `V3__create_spring_session_tables.sql`) on startup.
   - These create 17 business tables and the two Spring Session tables. The demo data in `V2__seed_test_data.sql` lives in test resources and is never applied in `dev` or `prod`.
   - A fresh database has no demo clubs, memberships, or committee assignments. Mock login creates the `users` row and an ACTIVE `student_profiles` row from the mock TU status, but grants no membership or committee access. API examples such as club ID `20001` are not seeded records.
   - To load local demo data (10 clubs, committee accounts and sample rounds with questions), start the app once so Flyway creates the tables, then run `scripts/seed-dev-data.sh`. It is safe to run again. It makes `student-demo` the president of ชมรมเขียนโปรแกรม so the club editor and question pages work, and prints the page URLs to try. It is for local development only.
   - Check application logs:
     ```bash
     docker compose logs -f app
     ```
   - In split mode, use `docker compose logs -f backend`.

4. **Smoke Test**:
   ```bash
   scripts/smoke-test.sh   # BASE_URL and DB_CONTAINER override the defaults
   ```
   It checks health, pages, the API and database, a mock login, and that PostgreSQL listens on loopback only, and exits non-zero on any failure.

### US-03 Demo Walkthrough (application submission)

After seeding, all of this works in the browser (`dev`, `TU_AUTH_MODE=mock`, password `tu-clubhub-demo`):

1. Log in as `student-demo`, the president of ชมรมเขียนโปรแกรม (`/clubs/3` on a fresh seed).
2. Edit the club at `/clubs/3/edit`.
3. Create a round at `/clubs/3/rounds/new` (or the home page button): opening time in the past, closing time in the future, a confirmation deadline after closing, and the questions in the form. Click **บันทึกและเผยแพร่**. A draft cannot be published later from the UI yet.
4. Open `/clubs/3`: the round appears with an apply button.
5. Log out, log in as `applicant-demo`, click **สมัครเข้าร่วมชมรมนี้**, fill in the form, review and submit. The app navigates automatically to the responsive result page, which shows the application number and `SUBMITTED`.

`student-demo` cannot apply to its own club (it is already a member). The application history page (US-04) is not built yet.

---

## 5. Persistence and Lifecycle Management

### Preserving Data Across Container Restarts

Database data is stored in the named Docker volume `postgres_data`. Stopping or recreating application containers will **not** erase your database:
```bash
# Stop containers
docker compose stop

# Restart containers (all data is preserved)
docker compose start

# Rebuild application without affecting database volume
docker compose up --build -d app
```

### Complete Clean Slate (Resetting Database)

To completely reset the database and re-run all migrations from scratch:
```bash
docker compose down -v
docker compose up --build
```
> [!WARNING]
> The `-v` flag deletes named Docker volumes (`postgres_data`). All stored users, clubs, and session records will be permanently removed.

---

## 6. Security & Isolation Notes

1. **Loopback Database Binding**:
   - The PostgreSQL service is configured with `- "127.0.0.1:5432:5432"`.
   - This ensures the database port is only reachable from your local machine (localhost) and is not exposed to public/local networks.
2. **Non-Root Execution**:
   - Application containers run under an unprivileged system user (`appuser:appgroup`, UID/GID non-root) for security hardening.
3. **Local Configuration**:
   - `.env.example` and Compose include local database defaults. Real TU mode requires the server-side endpoint URL and Application-Key; the fixed mock login does not verify access to TU's live service.
