# Task84 — CD Staging verification report

**Status: Pending verification and review.** This document is a handoff, not evidence of an approved task, merged PR, or successful Staging deployment. Record results for the final commit and link the actual runs after they happen.

| Check | Environment / evidence needed | Status |
|---|---|---|
| Frontend lint, test and build | GitHub CI for the revision under review | Pending final run |
| Backend verify and system integration / Flyway | GitHub CI with isolated PostgreSQL for the same revision | Pending final run |
| Compose build and smoke | Ephemeral runner and disposable database; mock authentication | Pending final run |
| PR deploy isolation | PR run, including same-repository PR; no Staging deployment | Pending final run |
| Existing PostgreSQL volume upgrade | Disposable old-version volume with sentinel data and original password | Pending Docker-capable test |
| Real deployment, image identity and health | Dedicated Staging server, requested image digests and commit, `/actuator/health`, `/actuator/info` matching the full deployed commit and application image digest, and home page | Pending infrastructure and execution |
| Reviewer approval / merge | Actual review and merge evidence | Pending |

Local pre-review checks on 2026-11-15 used an isolated checkout: frontend `npm run lint`, `npm test` (178 passed), and `npm run build` passed. Backend `./mvnw clean verify` passed 840 tests and the system-integration test selection passed 549 tests against disposable PostgreSQL 17. The CD script/workflow unit suite, actionlint and ShellCheck passed locally. A separate disposable Docker Compose project built both images, completed the mock-auth smoke test (10/10 checks), and retained sentinel data when recreated with the original password fallback. A rebuilt application returned the supplied synthetic commit and image digest from `/actuator/info` with `Cache-Control: no-store`. These checks preceded the latest `main` merge and do not replace the final GitHub run or a real staging deployment.

The deployment script supplies `DEPLOY_COMMIT` and `DEPLOY_IMAGE_DIGEST` to Compose; `GET /actuator/info` exposes `commit` and `imageDigest` fields that must equal the full 40-character SHA and application `sha256:` image digest (`unknown` when invalid or unset). A successful Compose run on a GitHub runner validates a disposable stack only. It does not establish deployment to a separate Staging server. Record actual commands, run URLs, timestamps and failures here or in a linked reviewer artifact; do not include credentials, session cookies or private data.

The deployment procedure, server prerequisites, rollback limitations and troubleshooting are in the [Staging deployment guide](../deployment/staging.md). Follow [Task56](../tasks/sprint2/Task56.md) for the real Staging smoke test and [Task84](../tasks/sprint2/Task84.md) for acceptance and review status.
