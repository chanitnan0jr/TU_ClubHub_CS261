#!/usr/bin/env bash
# Smoke test for a running compose stack: health, pages, API and database, session login.
# Login uses the dev mock account; set SMOKE_USER/SMOKE_PASSWORD for another one, or
# SMOKE_USER= to skip it. Exits non-zero if any check fails.
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
DB_CONTAINER="${DB_CONTAINER:-tu-clubhub-db}"
SMOKE_USER="${SMOKE_USER-student-demo}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-tu-clubhub-demo}"
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT
failures=0

check() { # name, actual, expected
  if [[ "$2" == "$3" ]]; then echo "PASS  $1"; else echo "FAIL  $1: got '$2', expected '$3'"; failures=$((failures + 1)); fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

check "health is UP" "$(curl -s "$BASE_URL/actuator/health")" '{"status":"UP"}'
check "home page" "$(curl -s "$BASE_URL/" | grep -c '<div id="root">')" "1"
check "SPA deep link /clubs/1" "$(status "$BASE_URL/clubs/1")" "200"
# A missing club is a Problem 404 only if the API reached the database.
check "public API and database" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$BASE_URL/api/v1/public/clubs/999999999")" "404 application/problem+json"
check "protected API needs a session" "$(status "$BASE_URL/api/v1/auth/me")" "401"

if [[ -n "$SMOKE_USER" ]]; then
  csrf="$(curl -s -c "$jar" -b "$jar" "$BASE_URL/api/v1/auth/csrf" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  check "login with CSRF" "$(status -c "$jar" -b "$jar" -H "X-CSRF-TOKEN: $csrf" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$SMOKE_USER\",\"password\":\"$SMOKE_PASSWORD\"}" "$BASE_URL/api/v1/auth/login")" "200"
  check "session reaches /me" "$(status -b "$jar" "$BASE_URL/api/v1/auth/me")" "200"
fi

if command -v docker >/dev/null && docker container inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  check "database port bound to loopback only" "$(docker port "$DB_CONTAINER" 5432 | cut -d: -f1 | sort -u | tr '\n' ' ')" "127.0.0.1 "
else
  echo "SKIP  database port check ($DB_CONTAINER not found)"
fi

echo "$failures failure(s)"
exit $((failures > 0))
