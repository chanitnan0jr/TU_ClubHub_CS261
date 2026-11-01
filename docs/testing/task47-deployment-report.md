# Task47 — Docker Compose deployment, migrations and smoke test (U03)

Covers Task47:U03-DO-1 (deploy the full stack with Docker Compose), Task47:U03-BE-1 (Flyway migrations and test data) and Task47:U03-QA-1 (smoke test). Run on 2026-11-01 on the team's demo machine (Linux, Docker Engine with Compose V2) from a fresh `git clone` at commit `ad2468a`.

## Setup

The developer's own `tu-clubhub` stack was already running on ports 8080 and 5434, and `compose.yaml` fixes the container names, so this run used a separate project with its own containers, ports and volume:

```bash
cp .env.example .env            # then PORT=18080, POSTGRES_HOST_PORT=55433
cat > qa-override.yaml <<'EOF'
services:
  db:  { container_name: tu-clubhub-qa-db }
  app: { container_name: tu-clubhub-qa-app }
EOF
docker compose -p tu-clubhub-qa -f compose.yaml -f qa-override.yaml down -v
docker compose -p tu-clubhub-qa -f compose.yaml -f qa-override.yaml up --build -d
```

A normal demo needs only `cp .env.example .env` and `docker compose up --build` ([local demo guide](../deployment/local-demo.md)).

## Task47:U03-DO-1 — deployment

| Check | Result |
|---|---|
| Image build and start | Built and started in 25 s (15:22:09–15:22:34); `db` healthy before `app` started |
| Containers | `tu-clubhub-qa-app` on `0.0.0.0:18080→8080`, `tu-clubhub-qa-db` on `127.0.0.1:55433→5432` |
| Profile and auth | `dev` profile, `TU_AUTH_MODE=mock` (Compose defaults) |
| Application log | `Started ClubhubApplication in 7.4 s`, Tomcat on 8080 |

**Defect found and fixed:** `compose.yaml` passed `.env` `PORT` into the container as Spring's port but mapped `${PORT}:8080`. With `PORT=18080`, Tomcat listened on 18080 behind a mapping to 8080, and every request hung. Fixed in `4d32b77`: the container always uses 8080 and `PORT` picks only the host port.

## Task47:U03-BE-1 — migrations and test data

| Check | Result |
|---|---|
| Flyway history | V1 `init schema` and V3 `create spring session tables`, both successful |
| Tables | 19 = 17 business tables + 2 Spring Session tables |
| `scripts/seed-dev-data.sh` (`DB_CONTAINER=tu-clubhub-qa-db`) | Loaded and self-checked; prints the 10 club pages |
| Seeded data | 10 clubs, 4 categories, 8 seed users (1 ADMIN), 7 student profiles, 5 PRESIDENT assignments, 9 memberships, 3 rounds, 5 questions |
| Re-run of the seed script | Succeeds, still 10 clubs |
| Accounts that can log in | `student-demo` (president of ชมรมเขียนโปรแกรม) and `applicant-demo`; both logged in during the [U03 flow run](task48-u03-flow-report.md) |

`SeedDataMigrationTest` checks the same counts in CI.

## Task47:U03-QA-1 — smoke test

`BASE_URL=http://localhost:18080 DB_CONTAINER=tu-clubhub-qa-db scripts/smoke-test.sh`:

```text
PASS  health is UP
PASS  home page
PASS  SPA deep link /clubs/1
PASS  public API and database
PASS  protected API needs a session
PASS  login with CSRF
PASS  session reaches /me
PASS  database port bound to loopback only
0 failure(s)
```

Against a port with nothing running, the script reported 5 failures, skipped the database check, and exited 1.
