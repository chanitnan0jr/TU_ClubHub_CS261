# QA — Task70 membership offer decision UI (PR #83)

Date: **2026-11-15**. Branch `task70-membership-decision`, PR #83, base `main`
(`d0e122e`), PR head before review fixes `8d9113b`. Reviewed against
[`Task70.md`](../tasks/sprint2/Task70.md),
[`task75-sprint2-design.md`](../architecture/task75-sprint2-design.md) (§2.5, §3),
[`openapi.yaml`](../api/openapi.yaml) (`MembershipOfferResponse`, `MembershipOfferConflict`),
and `COMMIT_RULES.md`. API/OpenAPI contracts were unchanged.

## Verdict

**Ready for reviewer inspection and PR update:** all Task70 acceptance criteria,
PR #83 review findings, and frontend quality gates pass under mocked `fetch`
integration tests. End-to-end execution against a live backend is **not run**
because the Task69 `/confirm` and `/decline` endpoints are not yet present in
`backend/src/main` on this branch.

## Review Findings and Fixes

| Finding | Cause & Impact | Resolution | File(s) |
|---|---|---|---|
| Skeleton flash & focus loss on success (🟠1) | Calling `reload()` reset `isLoading` to `true`, unmounting the page and losing scroll/focus | Patched `useApiResource` cache via `update()` using `applyOfferResult()` without refetching `GET` | `MyApplicationsPage.tsx` |
| Stale action buttons after `409` conflict (🟠2) | Conflict responses (e.g., expired deadline, already responded) kept action buttons rendered | Trigger `reload()` when `ApiError.status === 409` to resync state from the server | `MyApplicationsPage.tsx` |
| Dialog closable while request in flight (🟡3) | Pressing `Esc` or clicking cancel dismissed the modal before `POST` settled | Guarded `closeDecision()` with `if (!isProcessing)` | `MyApplicationsPage.tsx` |
| Stale error alert across reopen (🟡4) | Opening a new decision dialog left the previous `actionError` banner visible | Clear `actionError` inside `openDecision()` | `MyApplicationsPage.tsx` |
| Contract & prop gaps | `MembershipOfferResponse.status` was too wide; error fixture used `'CONFLICT'` instead of `'RESOURCE_CONFLICT'`; optional `clubName`/`roundTitle` | Narrowed `status` to `'CONFIRMED' \| 'DECLINED'`, required dialog props, fixed test fixture | `application.ts`, `MembershipDecisionDialog.tsx`, `myApplications.test.ts` |
| Duplicated confirm/decline paths | Separate `ConfirmMembershipDialog`/`DeclineMembershipDialog`, handlers, boolean states, and service functions | Consolidated into `MembershipDecision`, `respondToMembershipOffer()`, `MembershipDecisionDialog`, `openDecision`/`submitDecision` | `application.ts`, `myApplicationService.ts`, `MembershipDecisionDialog.tsx`, `MyApplicationsPage.tsx` |

## Case Matrix

Tests are located in `frontend/tests/myApplications.test.ts`.

| Case / Criteria | Test method(s) | Result | Evidence |
|---|---|---|---|
| AC1 (Positive): Offer buttons appear on `ACCEPTED_PENDING_CONFIRMATION` | `my application detail page confirms membership offer via dialog and updates UI immediately`, `...declines...` | PASS | Buttons visible when `canConfirm` / `canDecline` are true; wireframe irreversible-decision hint displayed |
| AC1 (Negative): Buttons hidden outside confirmable offers | `my application detail page hides offer decision buttons outside confirmable offers` | PASS | Verified absent for `SUBMITTED`, `REJECTED`, `CONFIRMED`, `DECLINED`, and `ACCEPTED_PENDING_CONFIRMATION` with `canConfirm: false, canDecline: false` |
| AC2: Confirmation modal with irreversible warning & CSRF write | `...confirms membership offer...`, `...declines membership offer...` | PASS | Dialog renders Thai warning text; `POST /confirm` and `/decline` send `X-CSRF-TOKEN` |
| AC3 / 🟠1: Immediate UI & timeline update without refetch | `...confirms membership offer...`, `...declines membership offer...` | PASS | Banner updates immediately; status badge + timeline entry added; `GET /api/v1/me/applications/90001` called once (`detailGets.length === 1`) |
| 🟠2: `409` conflict message & server state resync | `my application detail page shows Thai conflict message when confirmation fails`, `...reloads server state and hides buttons on 409 state mismatch` | PASS | Displays Thai conflict messages (`MEMBERSHIP_LIMIT_REACHED`, `CONFIRMATION_DEADLINE_EXPIRED`); `GET` detail reloads (`=== 2`) and hides expired buttons |
| 🟡3: Busy guard while request is pending | `my application detail page keeps decision dialog open while request is busy` | PASS | Pressing `Escape` and clicking cancel while `POST` is unresolved keep dialog open with busy label; closes and updates once resolved |
| 🟡4: Stale alert reset on dialog reopen | `my application detail page clears previous error alert when opening decision dialog` | PASS | `500` error alert clears as soon as the decision button reopens the dialog |

## Verification Commands and Results

Executed in `frontend/` after all code and test changes:

| Check | Result | Output summary |
|---|---|---|
| `npm test` (`tsx --test tests/*.test.ts`) | PASS | 153 tests, 153 passed, 0 failed, 0 skipped |
| `npm run lint` (`oxlint`) | PASS | 0 warnings, 0 errors (117 files, 116 rules) |
| `npm run build` (`tsc -b && vite build`) | PASS | TypeScript check and Vite production bundle succeeded |
| Deprecated symbol check (`grep -rn "ConfirmMembershipDialog\|DeclineMembershipDialog\|confirmMembershipOffer\|declineMembershipOffer" src tests`) | PASS | 0 remaining references |
| `git diff --check` | PASS | 0 whitespace/conflict marker issues |

## Not Covered / Scope Notes

- **Live backend E2E:** Not run; `/api/v1/me/applications/{id}/confirm` and `/decline` (Task69) are not merged in `backend/src/main` on this branch, so HTTP responses are stubbed via `stubFetch` in `frontend/tests/helpers.ts`.
- **Git push / PR update:** Local commits remain on `task70-membership-decision` pending reviewer review before pushing to origin.
