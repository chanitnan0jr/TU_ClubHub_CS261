# Task29:U08-BE-2 — Question feature defect review

Goal: find and fix defects in screening-question management (US-08). Done on 2026-11-01 on the [Task47 QA stack](task47-deployment-report.md) with the seed data.

## Reported defects

None were open:
- The [Task29 QA report](task29-application-questions-test-report.md) passed 21/21 and lists no defects.
- No GitHub issue covers questions.
- Reviews of PRs #40, #43, #47, #48 and #51 raised no unresolved item.

So the feature was checked independently.

## API checks (19)

Run as `student-demo` (president of club 3) against the seeded draft round, using `applicant-demo` and an anonymous session for permission cases:

| Check | Result |
|---|---|
| List in `displayOrder`; create trims text and appends; blank/missing/null fields → 400; malformed JSON → 400 Problem | Pass |
| Update text and `isRequired` keeps the order; a question of another round → 404 | Pass |
| Reorder assigns 1..n; a missing, duplicate or foreign ID → 400 | Pass |
| Delete → 204 and the remaining order is compacted to 1..n | Pass |
| A published round → 409; another student → 403; no session → 401; missing round → 404; non-numeric ID → 400 | Pass |
| A request with an unknown field (`displayOrder`) → 400 per `additionalProperties: false` | **Fail: accepted, field ignored** (see below) |

## UI checks (8)

In Chromium on `/clubs/3/rounds/{roundId}/questions`: list in order; add, with the confirm button disabled for blank text; move up; edit text and the required flag; delete with confirmation and compaction (each checked in the database); a write on a published round; a missing round; a student without committee rights. All 8 passed after the fixes below.

## Defects found and fixed (`e623c07`)

| Defect | Fix |
|---|---|
| The delete dialog told the president that deleting would hide or remove applicants' answers and asked them to accept it. Deleting is only possible in a draft round with no applications, and answers are never deleted. | Accurate text; the unused applicant-count and hard-block branches are removed |
| A 409 showed the backend's English detail ("Only open draft rounds can have their questions edited") instead of the Thai explanation, because the Thai text was used only when the detail was empty. | Thai message for every 409 from the question endpoints |

## Not fixed here

- **Unknown JSON fields are ignored, not rejected.** The same happens on `PUT /api/v1/clubs/{clubId}` and `POST /api/v1/auth/login`; only application submission rejects them. Protected fields stay unchanged (a `status` sent to the club update was ignored), so nothing can be changed this way. Because it affects the whole API, it belongs with the response and error rules in Sprint 2 Task80 (AUTH-06), not with this card.
- **`reason: QUESTION_HAS_ANSWERS`** is not returned yet. The contract assigns it to Task51.

Result: no open question defects remain after `e623c07`.
