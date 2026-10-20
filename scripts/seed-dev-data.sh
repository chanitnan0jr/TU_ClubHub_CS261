#!/usr/bin/env bash
# DEV ONLY. Loads local seed data into the compose database: V2__seed_test_data.sql
# (clubs, fictional users, presidents), then seed-dev-demo.sql (student-demo becomes
# president of ชมรมเขียนโปรแกรม, plus sample rounds and questions). Safe to run again.
# Start the app once first so Flyway creates the tables: docker compose up --build
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Defaults match compose.yaml.
psql_db() {
  docker exec -i "${DB_CONTAINER:-tu-clubhub-db}" \
    psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-tu_clubhub}" -q -v ON_ERROR_STOP=1 "$@"
}

[[ -n "$(psql_db -At -c "SELECT to_regclass('public.clubs')")" ]] || {
  echo "error: cannot read the clubs table. Is the db container up and the app started once (docker compose up --build)?" >&2
  exit 1
}

psql_db < backend/src/test/resources/db/migration/V2__seed_test_data.sql
psql_db < scripts/seed-dev-demo.sql

# Self-check: the demo pages need student-demo to be a committee member.
[[ "$(psql_db -At -c "SELECT EXISTS (
      SELECT 1 FROM club_committee_assignments a
      JOIN club_memberships m ON m.id = a.membership_id
      JOIN users u ON u.id = m.user_id WHERE u.tu_username = 'student-demo')")" == t ]] || {
  echo "seed check failed: student-demo has no committee assignment" >&2
  exit 1
}

echo "Seeded. Log in at http://localhost:8080 as student-demo / tu-clubhub-demo (TU_AUTH_MODE=mock)."
echo "student-demo is president of ชมรมเขียนโปรแกรม, so /clubs/<id>/edit works for it. Club pages:"
psql_db -At -F '  ' -c "SELECT '/clubs/' || id, name FROM clubs ORDER BY id"
echo "Draft round for the question page:"
psql_db -At -F '  ' -c "SELECT '/clubs/' || club_id || '/rounds/' || id || '/questions', title
                        FROM recruitment_rounds
                        WHERE title LIKE 'DEMO: %' AND publication_status = 'DRAFT'"
