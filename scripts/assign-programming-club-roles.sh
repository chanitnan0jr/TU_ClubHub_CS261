#!/usr/bin/env bash
# DEV ONLY. Checks whether specific Student IDs already exist in the compose
# database and assigns their roles:
#   6809660027 -> PRESIDENT (ประธานชมรม) of "ชมรมเขียนโปรแกรม"
#   6809616862 -> ADMIN (system_role = ADMIN)
# Users must have logged in once first so their users/student_profiles rows exist.
set -euo pipefail

CLUB_NAME="${CLUB_NAME:-ชมรมเขียนโปรแกรม}"

psql_db() {
  docker exec -i "${DB_CONTAINER:-tu-clubhub-db}" \
    psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-tu_clubhub}" -q -At -v ON_ERROR_STOP=1 "$@"
}

find_active_user_by_student_id() {
  local sid="$1"
  local row user_id tu_username account_status student_status

  row="$(psql_db -F '|' -v sid="$sid" <<'SQL'
SELECT u.id, u.tu_username, u.account_status, coalesce(sp.student_status, '')
FROM users u
LEFT JOIN student_profiles sp ON sp.user_id = u.id
WHERE sp.student_code = :'sid' OR u.tu_username = :'sid'
ORDER BY coalesce(sp.student_code = :'sid', false) DESC, u.id
LIMIT 1;
SQL
)"

  if [[ -z "$row" ]]; then
    echo "SKIP  $sid: user row not found (log in once first)" >&2
    return 1
  fi

  IFS='|' read -r user_id tu_username account_status student_status <<<"$row"

  if [[ "$account_status" != "ACTIVE" ]]; then
    echo "SKIP  $sid ($tu_username): account_status is '$account_status' (must be ACTIVE)" >&2
    return 1
  fi

  printf '%s|%s|%s\n' "$user_id" "$tu_username" "$student_status"
}

assign_club_role_by_student_id() {
  local sid="$1"
  local perm="$2"
  local club_id="$3"
  local user_info user_id tu_username student_status

  user_info="$(find_active_user_by_student_id "$sid")" || return 0
  IFS='|' read -r user_id tu_username student_status <<<"$user_info"

  if [[ "$student_status" != "ACTIVE" ]]; then
    echo "SKIP  $sid ($tu_username): student_status is '${student_status:-MISSING}' (must be ACTIVE)"
    return 0
  fi

  psql_db -v user_id="$user_id" -v club_id="$club_id" -v perm="$perm" <<'SQL'
BEGIN;

INSERT INTO club_memberships (club_id, user_id, status, joined_at)
VALUES (:'club_id', :'user_id', 'ACTIVE', now() - interval '1 minute')
ON CONFLICT (club_id, user_id) DO UPDATE
SET status = 'ACTIVE',
    ended_at = NULL,
    joined_at = least(club_memberships.joined_at, excluded.joined_at),
    updated_at = now(),
    version = club_memberships.version + 1;

UPDATE club_committee_assignments a
SET status = 'REVOKED',
    revoked_at = now(),
    revoked_by = :'user_id',
    revocation_reason = 'Reassigned via dev script',
    updated_at = now(),
    version = a.version + 1
FROM club_memberships m
WHERE a.membership_id = m.id
  AND m.club_id = :'club_id'
  AND m.user_id = :'user_id'
  AND a.status = 'ACTIVE'
  AND a.revoked_at IS NULL
  AND a.permission_role <> :'perm';

INSERT INTO club_committee_assignments
    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by, assignment_reason)
SELECT m.id,
       CASE :'perm' WHEN 'PRESIDENT' THEN 'ประธานชมรม' ELSE 'คณะกรรมการ' END,
       :'perm',
       now() - interval '1 minute',
       now() + interval '1 year',
       :'user_id',
       'Assigned via dev script'
FROM club_memberships m
WHERE m.club_id = :'club_id'
  AND m.user_id = :'user_id'
  AND NOT EXISTS (
      SELECT 1
      FROM club_committee_assignments a
      WHERE a.membership_id = m.id
        AND a.permission_role = :'perm'
        AND a.status = 'ACTIVE'
        AND a.revoked_at IS NULL
        AND a.starts_at <= now()
        AND now() < a.ends_at
  );

COMMIT;
SQL

  echo "OK    $sid ($tu_username) -> $perm of $CLUB_NAME (club_id=$club_id)"
}

assign_admin_by_student_id() {
  local sid="$1"
  local club_id="$2"
  local user_info user_id tu_username _student_status

  user_info="$(find_active_user_by_student_id "$sid")" || return 0
  IFS='|' read -r user_id tu_username _student_status <<<"$user_info"

  psql_db -v user_id="$user_id" -v club_id="$club_id" <<'SQL'
BEGIN;

UPDATE users
SET system_role = 'ADMIN',
    updated_at = now(),
    version = version + 1
WHERE id = :'user_id'
  AND system_role <> 'ADMIN';

UPDATE club_committee_assignments a
SET status = 'REVOKED',
    revoked_at = now(),
    revoked_by = :'user_id',
    revocation_reason = 'Reassigned to ADMIN via dev script',
    updated_at = now(),
    version = a.version + 1
FROM club_memberships m
WHERE a.membership_id = m.id
  AND m.club_id = :'club_id'
  AND m.user_id = :'user_id'
  AND a.status = 'ACTIVE'
  AND a.revoked_at IS NULL
  AND a.assignment_reason = 'Assigned via dev script';

COMMIT;
SQL

  echo "OK    $sid ($tu_username) -> ADMIN (log out and in again if already signed in)"
}

club_id="$(psql_db -v club_name="$CLUB_NAME" <<<"SELECT id FROM clubs WHERE name = :'club_name' AND status = 'ACTIVE' LIMIT 1;")"
if [[ -z "$club_id" ]]; then
  echo "error: ACTIVE club '$CLUB_NAME' not found. Run ./scripts/seed-dev-data.sh first." >&2
  exit 1
fi

assign_club_role_by_student_id "6809660027" "PRESIDENT" "$club_id"
assign_admin_by_student_id "6809616862" "$club_id"
