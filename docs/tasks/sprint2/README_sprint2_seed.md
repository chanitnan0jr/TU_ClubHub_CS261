                                                                                                      # Sprint 2: Database migration and seed data (without Docker)

Use on a **disposable local PostgreSQL 17 database only**. Do not run these seeds against production or a team-shared database.

## Prerequisites

- Windows with PostgreSQL Server 17 and `psql` installed, or access to a disposable PostgreSQL 17 database.
- Java/Maven Wrapper available to run this Spring Boot app.
- Existing repo files: `backend/src/main/resources/db/migration/V1__init_schema.sql`, `V3__create_spring_session_tables.sql`, `backend/src/test/resources/db/migration/V2__seed_test_data.sql`.

> `V2__seed_test_data.sql` is a **test-only Flyway script** located in `src/test/resources`; the dev app does **not** automatically run it. Run it manually here after Flyway has created the schema. Do **not** copy `V2` into `src/main/resources/db/migration`: the DB may already contain `V3`, causing out-of-order Flyway versioning issues or accidental data seeding on production.

## 1. Start PostgreSQL locally

Install PostgreSQL 17 for Windows from https://www.postgresql.org/download/windows/ if the server is not installed. Start the local PostgreSQL Windows service and confirm with `psql --version`. `psql` may need to be invoked from `C:\Program Files\PostgreSQL\17\bin` or added to PATH. The installation version 17 is chosen to match `compose.yaml` (Docker itself is not required).

In Git Bash, navigate to the repository's `backend` folder.

## 2. Make a clean local database

Connect to the PostgreSQL server via pgAdmin Query Tool on the default `postgres` database and run:

```sql
CREATE DATABASE tu_clubhub_s2_test;
```

Alternatively, with `psql` installed:

```bash
psql -h localhost -U postgres -d postgres -c 'CREATE DATABASE tu_clubhub_s2_test;'
```

## 3. Run the Spring Boot app once to apply Flyway V1/V3

**Git Bash** (`backend/` working directory):

```bash
read -rs -p 'Local PostgreSQL password: ' DB_PASSWORD; echo
export DB_PASSWORD
SPRING_PROFILES_ACTIVE=dev SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/tu_clubhub_s2_test' ./mvnw spring-boot:run
```

Never commit the password. Stop the server using Ctrl+C once startup/Flyway has completed.

Verify database migration history:

```bash
psql -h localhost -U postgres -d tu_clubhub_s2_test -c 'SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;'
```

Confirm versions `1` and `3` show `success = true`. The exact set of versions can vary if the team has introduced later migrations; avoid editing already-applied migrations.

## 4. Run the existing base seed and Sprint 2 extension

Place `sprint2_seed.sql` at `backend/src/main/resources/db/seed/sprint2_seed.sql` and run these commands from `backend/`:

```bash
psql -X -v ON_ERROR_STOP=1 -1 -h localhost -U postgres -d tu_clubhub_s2_test -f src/test/resources/db/migration/V2__seed_test_data.sql
psql -X -v ON_ERROR_STOP=1 -h localhost -U postgres -d tu_clubhub_s2_test -f src/main/resources/db/seed/sprint2_seed.sql
```

`psql` may ask for your local PostgreSQL password. There are no passwords in the seed data; authentication uses the app's TU mock/real integration, not a DB `password_hash` column.

**Alternative if `psql` is not on PATH:** Open each SQL file in pgAdmin Query Tool, run the existing base seed first, then the Sprint 2 seed, against `tu_clubhub_s2_test`.

## 5. Verify data and rerun safety

Run the following query twice: once after initial seed and once after rerunning `sprint2_seed.sql`. Counts should remain exactly one for each status for these specifically named test applicants. Run the second pass with the same `psql -f .../sprint2_seed.sql` command as above. Do not run against a non-disposable database.

```sql
SELECT a.status, COUNT(*) AS applications
FROM applications a
JOIN users u ON u.id = a.applicant_id
WHERE u.tu_username IN (
    'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
    'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
GROUP BY a.status ORDER BY a.status;
```

Expected 6 rows: `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CONFIRMED`, `DECLINED`; count = 1 for each.

Also confirm the `seed_s2_confirmed` user has an `ACTIVE` membership from an application and `seed_s2_declined` has none.

Place `verify_sprint2_seed.sql` at `backend/src/test/resources/db/seed/verify_sprint2_seed.sql`, then run from `backend/`:

```bash
psql -X -v ON_ERROR_STOP=1 -h localhost -U postgres -d tu_clubhub_s2_test -f src/test/resources/db/seed/verify_sprint2_seed.sql
```

Expected: `NOTICE: Sprint 2 seed verification PASSED`.

## 6. Privacy and review

- All newly created usernames use `seed_s2_` prefix and emails use `example.com`.
- No student ID or password from Thammasat University is used.
- `users` schema has no local password column; no credentials are stored in SQL.
- Review the original base V2 separately before merging changes into dev workflows.
- Attach terminal logs/screenshots of Flyway, counts, second run, and `git diff` to the PR.

## Important scope note

Schema compatibility with **Task75** requires checking `docs/architecture/task75-sprint2-design.md` and `docs/database/TU-ClubHub-ERD-Updated.dbml`. This sample is based only on the V1 schema and V2 seed supplied in chat. It does not claim Task75 has been fully verified and deliberately does not create an unnecessary `V4` migration.

## 7. Task75 schema audit and Flyway deliverable

Before deciding to add a new `V4__...sql` migration, compare `docs/architecture/task75-sprint2-design.md` and `docs/database/TU-ClubHub-ERD-Updated.dbml` against existing `V1` and `V3`. Create a **new versioned migration** only for actual schema differences; never edit applied versions. The existing SQL in this package is **seed-only**, not a replacement for this schema audit or a confirmed migration acceptance test.

## 8. Mock authentication caveat

The team's existing V2 seed states that only `student-demo` can sign in through the current mock TU auth. New `seed_s2_...` users are database fixtures for integration/API/data testing, not automatically usable login accounts. If US-04/05/09/10 UI tests need to log in as these users, coordinate with the authentication mock owner to expose appropriate fictional accounts.

## 9. Local database test status

These SQL files were prepared from the V1 schema and V2 fixture shared in chat. They have **not been executed against PostgreSQL** in this session; attach actual execution logs and rerun verification before marking acceptance criteria complete.
