#!/usr/bin/env bash
# Runs on the dedicated staging host; never removes the database volume.
set -euo pipefail

if [[ $# != 3 ]]; then
  echo 'usage: deploy-staging.sh DATABASE_IMAGE APP_IMAGE COMMIT_SHA' >&2
  exit 2
fi
DATABASE_IMAGE=$1
BACKEND_FRONTEND_IMAGE=$2
commit_sha=$3
image_pattern='^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'
[[ $DATABASE_IMAGE =~ $image_pattern && $BACKEND_FRONTEND_IMAGE =~ $image_pattern && $commit_sha =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Invalid immutable image reference or commit SHA' >&2
  exit 2
}
DEPLOY_COMMIT=$commit_sha
DEPLOY_IMAGE_DIGEST=${BACKEND_FRONTEND_IMAGE##*@}
export DATABASE_IMAGE BACKEND_FRONTEND_IMAGE DEPLOY_COMMIT DEPLOY_IMAGE_DIGEST
staging_dir=${STAGING_DIR:-/opt/tu-clubhub-staging}
release_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
[[ -r "$staging_dir/.env" ]] || { echo 'Missing staging .env' >&2; exit 1; }
compose=(docker compose --project-name tu-clubhub-staging --env-file "$staging_dir/.env" -f "$release_dir/compose.staging.yaml")

# Save previous immutable refs for an operator-led recovery; DB migrations are not reversed.
if [[ -f "$staging_dir/applied-images.txt" ]]; then
  cp "$staging_dir/applied-images.txt" "$staging_dir/previous-images.txt"
fi
"${compose[@]}" pull database backend-frontend
"${compose[@]}" up -d --no-build --remove-orphans database backend-frontend
for service in database backend-frontend; do
  container_id=$("${compose[@]}" ps -q "$service")
  [[ -n $container_id ]] || { echo "Missing container: $service" >&2; exit 1; }
  if [[ $service == database ]]; then image=$DATABASE_IMAGE; else image=$BACKEND_FRONTEND_IMAGE; fi
  expected_id=$(docker image inspect --format '{{.Id}}' "$image")
  actual_id=$(docker inspect --format '{{.Image}}' "$container_id")
  [[ $actual_id == "$expected_id" ]] || { echo "Image mismatch: $service" >&2; exit 1; }
  healthy=false
  for ((attempt=1; attempt<=36; attempt++)); do
    health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
    if [[ $health == healthy ]]; then healthy=true; break; fi
    if [[ $health == unhealthy || $health == exited || $health == dead ]]; then break; fi
    sleep 5
  done
  [[ $healthy == true ]] || { echo "Container did not become healthy: $service" >&2; exit 1; }
done
printf '%s\n%s\n%s\n' "$commit_sha" "$DATABASE_IMAGE" "$BACKEND_FRONTEND_IMAGE" > "$staging_dir/applied-images.txt"
echo "Staging containers match commit $commit_sha and are healthy."
