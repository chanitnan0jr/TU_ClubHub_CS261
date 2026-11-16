# Local Demonstration Guide with Docker Compose

This guide runs the current TU-ClubHub application and PostgreSQL locally using the checked-in Compose configuration. See [README](../../README.md#current-implementation) for feature status. Starting the containers does not make pending product workflows available.

---

## 1. Prerequisites

- **Docker Engine / Docker Desktop** with Docker Compose V2 support (`docker compose version`)
- **Port Availability**:
  - `8080`: Frontend HTTP port (Nginx, or configured `FRONTEND_PORT` / `PORT`)
  - `5432`: PostgreSQL database port (bound to loopback `127.0.0.1` only)

---

## 2. Environment Configuration

1. On first setup, copy `.example.env` to `.env`. Keep an existing local configuration:
   ```bash
   cp .example.env .env
   ```
2. Verify the default settings in `.env`:
   - `PORT=8080`: Default host port for the `frontend` Nginx container (`FRONTEND_PORT` overrides it if set).
   - `SPRING_PROFILES_ACTIVE=dev`: Enables Flyway schema migration and local development defaults.
   - `TU_AUTH_MODE=mock`: Uses the internal mock TU Authentication provider (no external university API credentials required).
   - `DEV=false`: Keeps the floating Dev Role Switcher disabled by default. Set `DEV=true` (requires `SPRING_PROFILES_ACTIVE=dev` and `TU_AUTH_MODE=mock`) to enable the `/api/v1/auth/dev/*` endpoints and floating role switcher pill (`USER`, `ADMIN`, `COMMITTEE`, `PRESIDENT`) in the UI.
   - `POSTGRES_DB=tu_clubhub`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=tu_clubhub_dev_secret`

An existing PostgreSQL volume retains its original password; keep its existing `.env` or `POSTGRES_PASSWORD` when upgrading. Changing an environment variable does not change a PostgreSQL role password. The Compose fallback remains compatible with the original fallback when no password is supplied.

Compose supplies database credentials to the containers. Spring Boot started directly from a terminal does not load this `.env`; follow the [standalone setup](../../README.md#standalone-local-development). To move the database host port, set `POSTGRES_HOST_PORT`; direct JVM connections must use the matching JDBC URL.

---

## 3. Starting the Full-Stack System (3-Container Architecture)

### Three-Container Stack (`database` + `backend` + `frontend`)

The default stack uses local `dev` settings; it is not a production deployment:

1. **`database` (`tu-clubhub-db`)**: PostgreSQL 17 Alpine with persistent storage in named volume `postgres_data`.
2. **`backend` (`tu-clubhub-backend`)**: Spring Boot REST API listening internally on port `8080`.
3. **`frontend` (`tu-clubhub-frontend`)**: Nginx serving the built React SPA and proxying `/api/` requests to `backend:8080`.

Execute from the repository root:
```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up --build -d
```

The optional `unified` profile runs a single combined Spring Boot + React container (`backend-frontend`) instead of separate `backend` and `frontend` containers. Select the services explicitly to avoid port conflicts:

```bash
docker compose --profile unified up -d --build database backend-frontend
```

The default frontend is at `http://localhost:8080`; Nginx proxies `/api/`, not `/actuator/`. Stop other running frontend/application containers first if their ports conflict.

---

## 4. Verifying the Deployment

1. **Check Service Health & Status**:
   ```bash
   docker compose ps
   ```
   Expect all three containers (`tu-clubhub-db`, `tu-clubhub-backend`, and `tu-clubhub-frontend`) to be running and healthy.

2. **Access the Application**:
   - Open your web browser and navigate to: [http://localhost:8080](http://localhost:8080) (or the configured `FRONTEND_PORT` / `PORT`).
   - With `dev` + `TU_AUTH_MODE=mock`, two accounts share the password `tu-clubhub-demo`: `student-demo` (president of ชมรมเขียนโปรแกรม after seeding) and `applicant-demo` (a student with no memberships, for applying to that club).
   - `/` is the public club directory (`/clubs`); after committee login, `/dashboard` and `/clubs/{clubId}/manage` provide club management shortcuts (`/clubs/{clubId}/edit`, `/clubs/{clubId}/rounds`, `/clubs/{clubId}/applications`, `/clubs/{clubId}/rounds/{roundId}/questions`), while `/admin/dashboard` shows the central admin overview. A fresh database has no clubs, so load the demo data first (step 3).
   - Check backend health with `docker compose exec backend wget -qO- http://127.0.0.1:8080/actuator/health` (or at [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) when using the optional `unified` profile).

3. **Database Migrations and Initial Data**:
   - Flyway automatically applies all database migrations (`V1__init_schema.sql`, `V3__create_spring_session_tables.sql`, `V4__committee_assignment_integrity_and_audit.sql`, `V5__add_club_name_search_index.sql`, `V6__selection_result_audit.sql`, `V7__allow_local_club_images.sql`) on startup.
   - These create 17 business tables and the two Spring Session tables. The demo data in `V2__seed_test_data.sql` lives in test resources and is never applied in `dev` or `prod`.
   - A fresh database has no demo clubs, memberships, or committee assignments. Mock login creates the `users` row and an ACTIVE `student_profiles` row from the mock TU status, but grants no membership or committee access. API examples such as club ID `20001` are not seeded records.
   - To load local demo data (10 clubs, committee accounts and sample rounds with questions), start the app once so Flyway creates the tables, then run `scripts/seed-dev-data.sh`. It is safe to run again. It makes `student-demo` the president of ชมรมเขียนโปรแกรม so the club editor and question pages work, and prints the page URLs to try. Set `APP_URL` to change the printed login URL for standalone development. It is for local development only.
   - Check application logs:
     ```bash
     docker compose logs -f backend frontend
     ```

4. **Smoke Test**:
   ```bash
   scripts/smoke-test.sh   # See script for endpoint and container overrides
   ```
   It checks health, pages, the API and database, a mock login, and that PostgreSQL listens on loopback only, and exits non-zero on any failure.
   For unified mode: `APP_CONTAINER=tu-clubhub-backend-frontend FRONTEND_CONTAINER=tu-clubhub-backend-frontend scripts/smoke-test.sh`. For a standalone backend, set the overrides described in the script.

### Sprint 1 Demo Walkthrough

After seeding, all of this works in the browser (`dev`, `TU_AUTH_MODE=mock`, password `tu-clubhub-demo`):

1. Log in as `student-demo`. The home page lists **ชมรมที่ฉันดูแล**: ชมรมเขียนโปรแกรม (`/clubs/3` on a fresh seed). Open it to reach the committee overview at `/clubs/3/manage`.
2. **โปรไฟล์ชมรม** (`/clubs/3/edit`): change the description, the category, the tags and the image URLs (`https://...` or local `/images/...` paths, previewed live), then save. **ดูหน้าโปรไฟล์สาธารณะ** shows the change straight away.
3. **จัดการรอบรับสมัคร** (`/clubs/3/rounds`) → **สร้างรอบรับสมัคร**: opening time in the past, closing time in the future, a confirmation deadline after closing, and the questions. Save it as a draft, use **แก้ไข** to change it, then **เผยแพร่**.
4. Open **สำรวจชมรม** (`/clubs`) and select **เปิดรับสมัครอยู่** to find clubs with open rounds. `/clubs/3` shows the current round and its application window. The old `/open-calls` URL redirects to the club directory.
5. Log out, log in as `applicant-demo`, click **สมัครเข้าชมรม** on the club card, fill in the form, review and submit. The result page shows the application number and `SUBMITTED`.
6. Log back in as `student-demo`, open `/clubs/3/rounds` and click **ปิดรับสมัคร** on the round. The card no longer offers an application link for that round, and opening its application form now answers `ROUND_CLOSED`.

`student-demo` cannot apply to its own club (it is already a member). For Sprint 2 workflows in local demo, applicants can track status and read results at `/me/applications` (the confirm/decline buttons call a backend endpoint that is not implemented yet), committees can review applications and publish results at `/clubs/{clubId}/applications`, and central admins can inspect university metrics at `/admin/dashboard` (optionally using the `DEV=true` role switcher pill to jump across `USER`, `ADMIN`, `COMMITTEE`, and `PRESIDENT`).

The base dev seed also creates closed example rounds for active demo clubs without an open or previously closed round. Their directory cards can display the latest closing time. The 30 activity images in `frontend/public/images/club-activities/` are generated illustrations for the ten demo banner assets, not photographs of real club events; the page labels them as such. See the [image README](../../frontend/public/images/club-activities/README.md). Other club images are not automatically mapped to this demo gallery.

Club detail embeds Google Maps using the club's location text. When no location is supplied, it defaults to Thammasat Rangsit; a button lets the visitor switch to that fallback. Google Maps may not match a room-level address, and the embedded map does not report an unmatched search to the page.

---

## 5. Persistence and Lifecycle Management

### Preserving Data Across Container Restarts

Database data is stored in the named Docker volume `postgres_data`. Stopping or recreating application containers will **not** erase your database:
```bash
# Stop containers
docker compose stop

# Restart containers (all data is preserved)
docker compose start

# Rebuild application services without affecting database volume
docker compose up --build -d backend frontend
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
