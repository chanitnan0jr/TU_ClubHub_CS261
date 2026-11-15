# Local Demonstration Guide with Docker Compose

This guide runs the current TU-ClubHub application and PostgreSQL locally using the checked-in Compose configuration. See [README](../../README.md#current-implementation) for feature status. Starting the containers does not make pending product workflows available.

---

## 1. Prerequisites

- **Docker Engine / Docker Desktop** with Docker Compose V2 support (`docker compose version`)
- **Port Availability**:
  - `8080`: Unified application HTTP port (or the configured `PORT`)
  - `80`: Optional split frontend HTTP port (Nginx)
  - `5432`: PostgreSQL database port (bound to loopback `127.0.0.1` only)

---

## 2. Environment Configuration

1. On first setup, copy `.example.env` to `.env`. Keep an existing local configuration:
   ```bash
   cp .example.env .env
   ```
2. Verify the default settings in `.env`:
   - `PORT=8080`: Host port for the default unified application; the container listens on port 8080.
   - `SPRING_PROFILES_ACTIVE=dev`: Enables Flyway schema migration and local development defaults.
   - `TU_AUTH_MODE=mock`: Uses the internal mock TU Authentication provider (no external university API credentials required).
   - `POSTGRES_DB=tu_clubhub`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=tu_clubhub_dev_secret`

An existing PostgreSQL volume retains its original password; keep its existing `.env` or `POSTGRES_PASSWORD` when upgrading. Changing an environment variable does not change a PostgreSQL role password. The Compose fallback remains compatible with the original fallback when no password is supplied.

Compose supplies database credentials to the containers. Spring Boot started directly from a terminal does not load this `.env`; follow the [standalone setup](../../README.md#standalone-local-development). To move the database host port, set `POSTGRES_HOST_PORT`; direct JVM connections must use the matching JDBC URL.

---

## 3. Starting the Full-Stack System (2-Container Architecture)

### Two-Container Stack (`backend-frontend` + `database`)

The default stack uses local `dev` settings; it is not a production deployment:

1. **`database` (`tu-clubhub-db`)**: PostgreSQL 17 Alpine with persistent storage in named volume `postgres_data`.
2. **`backend-frontend` (`tu-clubhub-backend-frontend`)**: Spring Boot with embedded React SPA, serving both the website and REST API.

Execute from the repository root:
```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up --build -d
```

The optional split profile runs separate backend and Nginx frontend containers. Select the services explicitly to avoid starting the unified service too:

```bash
docker compose --profile split up -d --build database backend frontend
```

The split frontend is at `http://localhost`; Nginx proxies `/api/`, not `/actuator/`. Stop other running frontend/application containers first if their ports conflict.

---

## 4. Verifying the Deployment

1. **Check Service Health & Status**:
   ```bash
   docker compose ps
   ```
   Expect both containers (`tu-clubhub-db` and `tu-clubhub-backend-frontend`) to be running and healthy.

2. **Access the Application**:
   - Open your web browser and navigate to: [http://localhost:8080](http://localhost:8080) (or the configured `PORT`).
   - With `dev` + `TU_AUTH_MODE=mock`, two accounts share the password `tu-clubhub-demo`: `student-demo` (president of ชมรมเขียนโปรแกรม after seeding) and `applicant-demo` (a student with no memberships, for applying to that club).
   - After login the home page has a launcher that takes a club ID (and round ID). The club pages are `/clubs/{clubId}`, `/clubs/{clubId}/edit` and `/clubs/{clubId}/rounds/{roundId}/questions`. A fresh database has no clubs, so load the demo data first (step 3).
   - Check application health at [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health). For split mode, run `docker compose exec backend wget -qO- http://localhost:8080/actuator/health`.

3. **Database Migrations and Initial Data**:
   - Flyway automatically applies all database migrations (`V1__init_schema.sql`, `V3__create_spring_session_tables.sql`) on startup.
   - These create 17 business tables and the two Spring Session tables. The demo data in `V2__seed_test_data.sql` lives in test resources and is never applied in `dev` or `prod`.
   - A fresh database has no demo clubs, memberships, or committee assignments. Mock login creates the `users` row and an ACTIVE `student_profiles` row from the mock TU status, but grants no membership or committee access. API examples such as club ID `20001` are not seeded records.
   - To load local demo data (10 clubs, committee accounts and sample rounds with questions), start the app once so Flyway creates the tables, then run `scripts/seed-dev-data.sh`. It is safe to run again. It makes `student-demo` the president of ชมรมเขียนโปรแกรม so the club editor and question pages work, and prints the page URLs to try. Set `APP_URL` to change the printed login URL for standalone development. It is for local development only.
   - Check application logs:
     ```bash
     docker compose logs -f backend-frontend
     ```

4. **Smoke Test**:
   ```bash
   scripts/smoke-test.sh   # See script for endpoint and container overrides
   ```
   It checks health, pages, the API and database, a mock login, and that PostgreSQL listens on loopback only, and exits non-zero on any failure.
   For split mode: `BASE_URL=http://localhost APP_CONTAINER=tu-clubhub-backend scripts/smoke-test.sh`. For a standalone backend, set the overrides described in the script.

### Sprint 1 Demo Walkthrough

After seeding, all of this works in the browser (`dev`, `TU_AUTH_MODE=mock`, password `tu-clubhub-demo`):

1. Log in as `student-demo`. The home page lists **ชมรมที่ฉันดูแล**: ชมรมเขียนโปรแกรม (`/clubs/3` on a fresh seed). Open it to reach the committee overview at `/clubs/3/manage`.
2. **โปรไฟล์ชมรม** (`/clubs/3/edit`): change the description, the category, the tags and the image URLs (HTTPS, previewed live), then save. **ดูหน้าโปรไฟล์สาธารณะ** shows the change straight away.
3. **จัดการรอบรับสมัคร** (`/clubs/3/rounds`) → **สร้างรอบรับสมัคร**: opening time in the past, closing time in the future, a confirmation deadline after closing, and the questions. Save it as a draft, use **แก้ไข** to change it, then **เผยแพร่**.
4. Open **รอบที่เปิดรับ** (`/open-calls`): the round is listed with its club, details and deadline. `/clubs/3` shows the same round with its details and results date.
5. Log out, log in as `applicant-demo`, click **สมัคร** on the board, fill in the form, review and submit. The result page shows the application number and `SUBMITTED`.
6. Log back in as `student-demo`, open `/clubs/3/rounds` and click **ปิดรับสมัคร** on the round. It disappears from `/open-calls`, and opening its application form now answers `ROUND_CLOSED`.

`student-demo` cannot apply to its own club (it is already a member). The application history page (US-04) and application review (US-09) are Sprint 2 work.

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
docker compose up --build -d backend-frontend
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
   - The application host port is not limited to loopback by this Compose configuration.
2. **Backend Execution**:
   - The backend container runs under an unprivileged system user (`appuser:appgroup`).
3. **Local Configuration**:
   - `.example.env` and Compose include local database defaults. Real TU mode requires the server-side endpoint URL and Application-Key; the fixed mock login does not verify access to TU's live service.
