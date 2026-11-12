# Task78 — Assignment concurrency plan

**Historical planning record. Implementation and local verification are recorded
in [the final Task78 handoff](task78-assignment-concurrency.md). This file preserves
the pre-implementation evidence and chosen strategy; it is not reviewer approval.**

## Repository baseline and evidence

- Branch `fix/assignment-concurrency`, worktree
  `/Users/mac/Documents/code/project/TU_ClubHub_CS261-task78`.
- Fetched origin and fast-forward pulled `main` at `e2712a9` on 2026-11-08;
  remote HEAD was independently confirmed as `refs/heads/main` at that hash.
- Task52 and Task65 remain uncommitted in their separate worktrees. No stash,
  hard reset, commit, push or PR was used.
- No applicable AGENTS.md found; read COMMIT_RULES.md and Task78 card.
- `ClubCommitteeAssignment` already has `@Version`, but only its constructor and
  persistence timestamps: no assignment mutation service or Admin HTTP controller.
- `ClubCommitteeAssignmentRepository` provides effective-grant queries (including
  PESSIMISTIC_READ when used in existing committee write transactions).
- No Admin assignment request/response/error contract exists in OpenAPI/API_v1.
- V1 schema has version and unique `(membership_id, permission_role, starts_at)`.
  That unique key alone does not encode the matrix's prohibition on overlapping
  unrevoked terms. This is a model/guard gap to address when implementing writes,
  not proof that a nonexistent production write endpoint has a reproduced bug.
- Assignment creation reason is required by permission matrix §5 but has no
  dedicated persisted field in the current assignment table. Revocation reason
  exists. This must be covered by the chosen implementation/audit design.

## Requirements already supported by repository evidence

Sources: [Task78](../tasks/sprint2/Task78.md),
[permission matrix](../security/permission-matrix.md) §§2, 5–7,
[Task75 locking design](../architecture/task75-sprint2-design.md) §4.2,
and V1__init_schema.sql.

- Actor: current ACTIVE global ADMIN from the database, not merely a stale role
  in session. Admin cannot appoint, renew, edit or revoke their own assignment.
- Appointment recipient: ACTIVE account/student, ACTIVE club and effective ACTIVE
  membership. Bootstrap membership is a separate workflow, not implied here.
- Revocation is allowed even when recipient/membership/club is inactive; the
  acting Admin must still be ACTIVE. Retain assignment history; no hard delete.
- A role/term change revokes the old row and creates a new row atomically. Do not
  rewrite old appointment terms or backdate to retroactively grant authority.
- Keep non-revoked periods disjoint for `(membership_id, permission_role)`;
  `[starts_at, ends_at)` permits adjacent terms. COMMITTEE and PRESIDENT are
  distinct permission roles; a title alone grants no extra role.
- Acquire assignment locks before club/round/application/membership-ranked locks,
  respecting the project's applicant/profile-first order. Share locks held by
  existing committee writers must conflict with Admin revocation.
- Grants are derived from current assignment/membership state, not a separate
  cached permission flag; revocation must affect the next permission check.

## Decision requested

The requester was asked to choose between:

1. A new minimal Admin API + OpenAPI/Markdown contract + durable appointment
   reason/audit migration + concurrent HTTP tests, or
2. An internal Assignment Service/Repository with integration tests only, without
   publishing an unconfirmed HTTP contract.

The requester selected option 1 on 2026-11-08. Because this is a missing write
capability, the implementation commit should use **feat**, not claim a fix to an
existing endpoint. The requested branch name can remain unchanged.

## Strategy recorded before implementation

- Use database transactions and deterministic row locks for the stable parent
  membership/profile and existing assignment rows. This covers concurrent inserts
  and multi-row revoke/create, which assignment `@Version` alone cannot cover.
- Recheck current Admin/recipient/grant state after waiting for the relevant locks.
- Require an expected version for an existing assignment mutation, so a request
  submitted from an old screen is rejected rather than silently serialized into
  overwriting another Admin's intent. No automatic conflict retries.
- Enforce logical duplicate/overlap rules and inspect all application write paths;
  do not rely on an exists-check outside the transaction or an in-memory mutex.
- Choose and document exact 409 reasons and lock failure mapping together with the
  confirmed contract. Never map arbitrary database exceptions to overlap/duplicate.
- Keep assignment writes and durable audit/reason writes atomic. Do not add role,
  account-status or membership-bootstrap capabilities as a side effect.

## Planned proof

- Two Admins modifying the same original assignment: one succeeds, stale request
  conflicts; retained old row and exactly one replacement, correct effective grant.
- Duplicate appointments: only one effective overlapping term, safe conflict for
  the other request; adjacent terms and distinct roles remain allowed.
- Appointment/replacement versus revocation: result follows the confirmed expected
  version and serialization policy, with no resurrected or lost grant.
- Test-only post-write failure during revoke/create/audit: rollback restores the
  old assignment and removes new/audit rows; retry succeeds and waiting workers
  can continue. Verify the intended failure stage and preserve unrelated rows.
- Revocation versus an existing committee writer: prove shared/exclusive assignment
  lock conflict and check actual permission after completion.
- If HTTP is selected: actual security filters and real Service/Repository, separate
  transactions/connections per worker, committed fixtures, bounded latches/barriers,
  PostgreSQL blocking evidence, collected exceptions and explicit cleanup. No sleeps.
- Repeat concurrency tests, run full backend verification, schema/contract checks
  if changed, and git diff --check. Report passed/failed/not-run separately.

Final PR/commit text and actual results will be recorded separately after
implementation and validation. The new API uses explicit create/replace/revoke
actions; replacing or revoking an existing assignment requires its current version.
