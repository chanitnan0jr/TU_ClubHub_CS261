# Local Demonstration Guide with Docker Compose

This document provides step-by-step instructions for running the complete TU-ClubHub system locally using Docker Compose, adhering to the project architecture specification ([scaffold-context.md](../architecture/scaffold-context.md) and [system-architecture.md](../architecture/system-architecture.md)).

---

## 1. Prerequisites

- **Docker Engine / Docker Desktop**: Version 24+ with Docker Compose V2 support (`docker compose version`)
- **Port Availability**:
  - `8080`: Default application HTTP port
  - `5432`: PostgreSQL database port (bound to loopback `127.0.0.1` only)
  - `80`: Optional port if running the split Nginx profile

---

## 2. Environment Configuration

1. Copy the template `.env.example` to create your local `.env` file:
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

---

## 3. Starting the Full-Stack System

### Primary Mode: Unified Monolith (Recommended)

This mode runs the system as defined for the production deployment (Render Web Service architecture):
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
docker compose --profile split up --build
```

---

## 4. Verifying the Deployment

1. **Check Service Health & Status**:
   ```bash
   docker compose ps
   ```
   Confirm that `tu-clubhub-db` is `healthy` and `tu-clubhub-app` is `running`.

2. **Access the Application**:
   - Open your web browser and navigate to: [http://localhost:8080](http://localhost:8080)
   - If using split mode: [http://localhost](http://localhost)

3. **Verify Database Migrations & Seed Data**:
   - Flyway automatically applies all database migrations (`V1__init_schema.sql`, `V3__create_spring_session_tables.sql`) on startup.
   - Check application logs:
     ```bash
     docker compose logs -f app
     ```

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
3. **No Hardcoded Secrets**:
   - All credentials and database passwords are parameterized through environment variables.
