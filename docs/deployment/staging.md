# Temporary stack verification on GitHub Actions

**Scope:** The requester specified that a real server is not required. Task84 therefore verifies the stack on a temporary GitHub-hosted runner. The runner and its database volume are removed after the job; this is not a persistent Staging deployment and does not provide a public URL. The original server-based acceptance criteria remain subject to Owner/Reviewer confirmation; see [Task84](../tasks/sprint2/Task84.md).

## Workflow

1. A pull request, push to `main`, or `v*` tag runs the relevant CI and integration checks for the triggering revision.
2. The workflow builds the database, backend, and frontend images, starts them with Docker Compose in an isolated runner, seeds disposable mock data, and executes `scripts/smoke-test.sh`.
3. A health, startup, seed or smoke failure fails the verification job. The job tears down only its disposable runner stack and volume.
4. On eligible `main`/release runs, the workflow publishes the images that passed verification to GHCR. PR verification does not publish images or require deployment secrets. Check the actual workflow run for the image references and digests.

The smoke test uses mock TU authentication, so it does not demonstrate connectivity to the real TU API. A successful runner check demonstrates the stack operated during that run; it does not establish a long-running environment or a deployment to an external server.

## Verification and evidence

Open the [Task84 report](../testing/task84-cd-staging-deploy-report.md) for recorded results, then inspect the latest GitHub Actions run for the PR commit or release commit. Review CI, the isolated stack verification and any publish result separately. Record the commit, run URL, test outcomes and reviewer decision without credentials or session data.

For local reproduction use the [local demo guide](local-demo.md). It uses your local Docker volumes: `docker compose down -v` deletes the associated database volume and must not be used when its data must be preserved. Isolate any destructive test with a distinct Compose project, container names, ports and volume.
