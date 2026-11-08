#!/usr/bin/env bash
# DEV ONLY. Gives a local account a role for testing, straight in the compose database:
#   list                                         accounts with their system and committee roles
#   admin|user <username>                        set the system role (ADMIN unlocks admin pages)
#   committee <username> <clubId> [COMMITTEE|PRESIDENT]
#                                                make the account an active committee member of a club
# Log in once with the account first so its user row and student profile exist.
set -euo pipefail

usage() {
  sed -n '3,6p' "$0" | sed 's/^# \{0,1\}/  /' >&2
  echo "usage: scripts/dev-role.sh list | admin|user <username> | committee <username> <clubId> [COMMITTEE|PRESIDENT]" >&2
  exit 2
}

# Defaults match compose.yaml.
psql_db() {
  docker exec -i "${DB_CONTAINER:-tu-clubhub-db}" \
    psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-tu_clubhub}" -q -At -v ON_ERROR_STOP=1 "$@"
}

user_id() {
  local id
  id=$(psql_db -v u="$1" <<<"SELECT id FROM users WHERE tu_username = :'u';")
  [[ -n $id ]] || { echo "error: no account '$1'. Log in once with it first." >&2; exit 1; }
  echo "$id"
}

case "${1:-}" in
  list)
    [[ $# -eq 1 ]] || usage
    psql_db -F ' | ' <<'SQL'
SELECT u.tu_username, u.system_role,
       coalesce(string_agg(a.permission_role || ' ' || c.id || ' ' || c.name, ', ' ORDER BY c.id), '-')
FROM users u
LEFT JOIN club_memberships m ON m.user_id = u.id AND m.status = 'ACTIVE' AND m.ended_at IS NULL
LEFT JOIN club_committee_assignments a ON a.membership_id = m.id AND a.status = 'ACTIVE'
     AND a.starts_at <= now() AND now() < a.ends_at
LEFT JOIN clubs c ON c.id = m.club_id
GROUP BY u.id
ORDER BY u.tu_username;
SQL
    ;;
  admin | user)
    [[ $# -eq 2 ]] || usage
    role=$([[ $1 == admin ]] && echo ADMIN || echo USER)
    id=$(user_id "$2")
    psql_db -v id="$id" -v role="$role" <<<"UPDATE users SET system_role = :'role', updated_at = now(), version = version + 1 WHERE id = :'id';"
    echo "$2 is now $role. Log out and in again so the session picks it up."
    ;;
  committee)
    [[ $# -eq 3 || $# -eq 4 ]] || usage
    perm=${4:-COMMITTEE}
    [[ $perm == COMMITTEE || $perm == PRESIDENT ]] || usage
    [[ $3 =~ ^[1-9][0-9]{0,17}$ ]] || { echo "error: clubId must be a positive number" >&2; exit 2; }
    id=$(user_id "$2")
    # Committee rights only count for an ACTIVE student in an ACTIVE club (permission matrix §2).
    [[ $(psql_db -v id="$id" <<<"SELECT student_status FROM student_profiles WHERE user_id = :'id';") == ACTIVE ]] ||
      { echo "error: '$2' has no ACTIVE student profile, so committee rights would not apply." >&2; exit 1; }
    club=$(psql_db -v club="$3" <<<"SELECT name FROM clubs WHERE id = :'club' AND status = 'ACTIVE';")
    [[ -n $club ]] || { echo "error: no ACTIVE club with id $3." >&2; exit 1; }
    psql_db -v id="$id" -v club="$3" -v perm="$perm" <<'SQL'
BEGIN;
INSERT INTO club_memberships (club_id, user_id, status, joined_at)
VALUES (:'club', :'id', 'ACTIVE', now() - interval '1 minute')
ON CONFLICT (club_id, user_id) DO UPDATE
SET status = 'ACTIVE', ended_at = NULL, joined_at = least(club_memberships.joined_at, excluded.joined_at),
    updated_at = now(), version = club_memberships.version + 1;
INSERT INTO club_committee_assignments
    (membership_id, position_name, permission_role, starts_at, ends_at, assigned_by)
SELECT m.id, CASE :'perm' WHEN 'PRESIDENT' THEN 'ประธานชมรม (dev)' ELSE 'กรรมการ (dev)' END,
       :'perm', now() - interval '1 minute', now() + interval '1 year', :'id'
FROM club_memberships m
WHERE m.club_id = :'club' AND m.user_id = :'id'
  AND NOT EXISTS (
      SELECT 1 FROM club_committee_assignments a
      WHERE a.membership_id = m.id AND a.permission_role = :'perm' AND a.status = 'ACTIVE'
        AND a.starts_at <= now() AND now() < a.ends_at);
COMMIT;
SQL
    echo "$2 is now $perm of club $3 ($club) for one year. Refresh the page; no new login needed."
    ;;
  *) usage ;;
esac
