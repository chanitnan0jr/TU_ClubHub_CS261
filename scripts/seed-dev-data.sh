#!/usr/bin/env bash
# Loads local development seed data into the ClubHub database.
#
#   1. backend/src/test/resources/db/migration/V2__seed_test_data.sql
#      4 categories, 10 clubs, tags, 7 fictional users, 4 club presidents.
#   2. scripts/seed-dev-demo.sql (skip with --base-only)
#      Makes the mock-auth account student-demo the PRESIDENT of
#      ชมรมเขียนโปรแกรม and adds recruitment rounds with questions.
#
# DEV ONLY. Never run it against a shared or production database.
# Safe to run again: existing rows are kept and the demo round windows are
# renewed. The schema must already exist, so start the app once first
# (Flyway creates the tables): docker compose up --build

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/seed-dev-data.sh [--base-only] [--yes] [--help]

  --base-only   Load only V2__seed_test_data.sql, not the demo accounts/rounds.
  -y, --yes     Do not stop to ask. Required when DATABASE_URL is set.
  -h, --help    Show this help.

Target (default: the docker compose database container):
  DB_CONTAINER    container name           (default: tu-clubhub-db)
  POSTGRES_USER   database user            (default: postgres)
  POSTGRES_DB     database name            (default: tu_clubhub)
  DATABASE_URL    use local psql with this URL instead of docker
  PORT            app port for printed URLs (default: 8080)
USAGE
}

BASE_ONLY=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --base-only) BASE_ONLY=true ;;
    -y|--yes) ASSUME_YES=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_SEED="$ROOT/backend/src/test/resources/db/migration/V2__seed_test_data.sql"
DEMO_SEED="$ROOT/scripts/seed-dev-demo.sql"

DB_CONTAINER="${DB_CONTAINER:-tu-clubhub-db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-tu_clubhub}"
DATABASE_URL="${DATABASE_URL:-}"
APP_PORT="${PORT:-8080}"

fail() { echo "error: $*" >&2; exit 1; }

run_psql() {
  if [[ -n "$DATABASE_URL" ]]; then
    psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"
  else
    docker exec -i "$DB_CONTAINER" \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -q -v ON_ERROR_STOP=1 "$@"
  fi
}

[[ -f "$BASE_SEED" ]] || fail "missing $BASE_SEED"
[[ -f "$DEMO_SEED" ]] || fail "missing $DEMO_SEED"

if [[ -n "$DATABASE_URL" ]]; then
  command -v psql >/dev/null || fail "psql is not installed (needed when DATABASE_URL is set)"
  [[ "$ASSUME_YES" == true ]] \
    || fail "DATABASE_URL is set, so this may not be the local compose database. Re-run with --yes to confirm."
  TARGET="DATABASE_URL"
else
  command -v docker >/dev/null || fail "docker is not installed (or set DATABASE_URL to use psql)"
  [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" == "true" ]] \
    || fail "container '$DB_CONTAINER' is not running. Start it with: docker compose up -d db"
  TARGET="container $DB_CONTAINER"
fi

[[ "$(run_psql -At -c "SELECT to_regclass('public.clubs') IS NOT NULL" 2>&1 || true)" == "t" ]] \
  || fail "the clubs table does not exist in $TARGET. Start the app once so Flyway creates the schema: docker compose up --build"

DB_NAME="$(run_psql -At -c 'SELECT current_database()')"
echo "Seeding database '$DB_NAME' ($TARGET)"

echo "-> V2__seed_test_data.sql"
run_psql < "$BASE_SEED"

if [[ "$BASE_ONLY" == false ]]; then
  echo "-> seed-dev-demo.sql"
  run_psql < "$DEMO_SEED"
fi

echo
echo "Done. Counts:"
run_psql -At -F ' : ' -c "
  SELECT 'clubs', count(*) FROM clubs
  UNION ALL SELECT 'users', count(*) FROM users
  UNION ALL SELECT 'recruitment rounds', count(*) FROM recruitment_rounds
  UNION ALL SELECT 'application questions', count(*) FROM application_questions" \
  | sed 's/^/  /'

if [[ "$BASE_ONLY" == false ]]; then
  BASE_URL="http://localhost:$APP_PORT"
  echo
  echo "Log in at $BASE_URL with student-demo / tu-clubhub-demo"
  echo "(needs TU_AUTH_MODE=mock). student-demo is PRESIDENT of ชมรมเขียนโปรแกรม."
  echo
  echo "Pages to try:"
  run_psql -At -F '|' -c "
    SELECT '/clubs/' || c.id, 'public page: ' || c.name
    FROM clubs c
    WHERE EXISTS (SELECT 1 FROM recruitment_rounds r
                  WHERE r.club_id = c.id AND r.title LIKE 'DEMO: %')
    UNION ALL
    SELECT '/clubs/' || c.id || '/edit', 'edit profile: ' || c.name
    FROM clubs c WHERE c.name = 'ชมรมเขียนโปรแกรม'
    UNION ALL
    SELECT '/clubs/' || c.id || '/rounds/' || r.id || '/questions',
           'questions of a ' || r.publication_status || ' round ('
             || CASE WHEN r.publication_status = 'DRAFT'
                     THEN 'can be edited' ELSE 'read-only' END || ')'
    FROM recruitment_rounds r JOIN clubs c ON c.id = r.club_id
    WHERE c.name = 'ชมรมเขียนโปรแกรม' AND r.title LIKE 'DEMO: %'" \
  | while IFS='|' read -r path label; do
      printf '  %s%s\n      %s\n' "$BASE_URL" "$path" "$label"
    done
fi
