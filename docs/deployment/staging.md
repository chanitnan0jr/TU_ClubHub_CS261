# Staging deployment on a Docker server

**Status:** Staging infrastructure, deployment and reviewer approval remain unverified until a real run is recorded in the [Task84 report](../testing/task84-cd-staging-deploy-report.md). A green PR container check is not a Staging deployment.

## Prerequisites

- A dedicated server with Docker Engine and Docker Compose V2, persistent storage, restricted network ingress and working backups. The deployment account's Docker access is effectively root-equivalent: restrict SSH and use this account only on the dedicated Staging host.
- `/opt/tu-clubhub-staging` exists and is writable by that account. Keep its `.env` readable only by the account. `compose.staging.yaml` requires `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `SPRING_PROFILES_ACTIVE`, `TU_AUTH_MODE`, `TU_AUTH_ENDPOINT_URL`, and `TU_AUTH_APPLICATION_KEY`. Configure valid server-side values and a host `PORT` if needed; do not copy real credentials into Git. The authentication adapter and profile must be appropriate for Staging; mock login proves no connection to TU.
- Configure the server's Docker client with read-only GHCR access if the images are private, using a credential helper or another protected mechanism. Do not put registry credentials in workflow logs or repository files.
- Expose the app through the intended Staging URL, use HTTPS and protect public ingress as required. PostgreSQL binds to the host loopback only. Confirm the SSH host public-key fingerprint through a trusted independent channel before putting the matching `known_hosts` entry in GitHub.
- On the GitHub `staging` environment, set variables `STAGING_HOST`, `STAGING_USER`, `STAGING_BASE_URL`, `STAGING_KNOWN_HOSTS`, and optionally `STAGING_PORT` (default 22). Store the dedicated deploy private key as secret `STAGING_SSH_KEY`. Restrict environment access according to the team's release policy. Never paste a private key or TU credentials into issues, PRs or logs.

## Deployment and verification

A PR builds and verifies a disposable stack without accessing Staging. On `main` or a `v*` release tag, the CD workflow requires the CI checks for the same commit, builds both images, and deploys their immutable digest references via SSH. The server's `tu-clubhub-staging` Compose project uses a named PostgreSQL volume. No demo seed is applied automatically.

The deployment script compares each running container's image ID with the pulled image for the requested digest and waits for both health checks. The workflow also checks the configured Staging endpoint: `GET /actuator/info` must return `{"commit":"<full 40-character SHA>","imageDigest":"sha256:<64-character digest>"}` matching the requested commit and application image digest. Either field defaults to `unknown` when invalid or unset. The deployment script supplies `DEPLOY_COMMIT` and `DEPLOY_IMAGE_DIGEST` to Compose from the validated deployment request. A missing setting, wrong commit or digest, or failed deployment/check must fail the job. Check the GitHub run output and record the commit, image digests, time and health/smoke outcome in the Task84 report without exposing secrets. An `UP` response alone cannot prove the version: verify the container/image match as well.

The staging job is serialized. A delayed `main` run fails rather than deploying if `main` has advanced by the time it acquires the deployment slot. A `v*` release tag deliberately deploys its tested commit, which can replace a newer staging revision; create release tags only when that behavior is intended.

For operator inspection on the Staging host, use the server's deployment files and environment; do not print `.env`:

```bash
cat /opt/tu-clubhub-staging/applied-images.txt
curl -fsS http://127.0.0.1:8080/actuator/health
curl -fsS http://127.0.0.1:8080/actuator/info
```

Use the configured `PORT` if it differs. Also confirm the external Staging home page loads without an HTTP 500. Coordinate the wider real-environment smoke test with [Task56](../tasks/sprint2/Task56.md).

## Data and recovery

The PostgreSQL named volume survives normal container replacement. **Do not run `docker compose down -v` against Staging.** Changing `POSTGRES_PASSWORD` in `.env` does not alter a role password in an already-initialized PostgreSQL volume. Use an explicit, reviewed password rotation procedure for an existing database.

Before a deployment with database migration, take a backup and test restore in an isolated environment. The deployment records the prior locally healthy image references in `previous-images.txt` when available; these do not prove that the external check passed. An operator must verify compatibility and choose whether to restore the previous application image or roll forward; an image rollback does **not** reverse Flyway migrations. If needed, restore the database from a tested backup under the team's recovery process. Preserve the failed run and diagnostic evidence without including credentials.

After reviewing schema compatibility and selecting the previous deployment, an operator can use the recorded image references with the current Staging Compose file. The first line of the file is the commit, followed by database and application image references:

```bash
cd /opt/tu-clubhub-staging
mapfile -t previous < previous-images.txt
export DEPLOY_COMMIT="${previous[0]}" DATABASE_IMAGE="${previous[1]}" BACKEND_FRONTEND_IMAGE="${previous[2]}"
export DEPLOY_IMAGE_DIGEST="${BACKEND_FRONTEND_IMAGE##*@}"
docker compose --project-name tu-clubhub-staging --env-file .env -f release/compose.staging.yaml pull database backend-frontend
docker compose --project-name tu-clubhub-staging --env-file .env -f release/compose.staging.yaml up -d --no-build database backend-frontend
docker compose --project-name tu-clubhub-staging --env-file .env -f release/compose.staging.yaml ps
unset DEPLOY_COMMIT DEPLOY_IMAGE_DIGEST DATABASE_IMAGE BACKEND_FRONTEND_IMAGE
```

Verify both container image IDs, health, and the external `/actuator/info` commit and image digest afterward, and record the manual recovery. This procedure does not modify `applied-images.txt` or roll back schema changes; reconcile the record and migration state after the team validates recovery. Workflow-provided release files live in `/opt/tu-clubhub-staging/release/`; protect the directory from modification by other users.
