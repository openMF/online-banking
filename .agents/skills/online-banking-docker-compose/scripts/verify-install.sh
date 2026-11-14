#!/bin/sh
# Check a Docker Compose install of Online Banking: container health, /health, the app page and
# the runtime configuration. Waits up to 2 minutes for the container to report healthy.
# Exits 0 only if all checks pass, 1 if a check fails, 2 if the stack isn't running or curl is
# missing. Usage: sh .agents/skills/online-banking-docker-compose/scripts/verify-install.sh
# (run from the repository root, where docker-compose.yml is)
# No set -e: a failing check must still reach the report below.
set -u

WAIT_SECONDS=120

command -v curl >/dev/null || { echo "error: curl is needed for the checks" >&2; exit 2; }
docker info >/dev/null 2>&1 || { echo "error: the Docker daemon isn't reachable" >&2; exit 2; }
container=$(docker compose ps -q web 2>/dev/null)
if [ -z "$container" ]; then
  echo "error: the web service isn't running; run 'docker compose up -d --build' in the repository root first" >&2
  exit 2
fi

# The published port, so the checks follow docker-compose.yml if the user changed 8080.
port=$(docker compose port web 80 2>/dev/null | head -n 1 | sed 's/.*://')
base="http://127.0.0.1:${port:-8080}"

health=""
deadline=$(( $(date +%s) + WAIT_SECONDS ))
while :; do
  health=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container")
  [ "$health" = "running/healthy" ] && break
  [ "$(date +%s)" -ge "$deadline" ] && break
  sleep 3
done

failures=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; failures=$((failures + 1)); }

# A proxy from the environment must not handle localhost.
get() { curl --noproxy '*' -s -m 10 "$@"; }

if [ "$health" = "running/healthy" ]; then
  pass "1. container running and healthy"
else
  fail "1. container running and healthy (status: $health)"
fi

body=$(get "$base/health")
if [ "$body" = "ok" ]; then pass "2. GET /health answers ok"; else fail "2. GET /health answers ok (got: '$body')"; fi

# -f: an HTTP error status leaves the body empty, so the pattern below fails.
page=$(get -f "$base/")
case "$page" in
  *'<title>MIFOS'*) pass "3. GET / serves the app page" ;;
  *) fail "3. GET / serves the app page (no MIFOS page at $base/)" ;;
esac

json=$(get -f "$base/runtime-config.json")
case "$json" in
  null) pass "4. runtime configuration: standalone demo (no backend configured)" ;;
  '{"baseUrl":'*) pass "4. runtime configuration: Self Service backend $json" ;;
  *) fail "4. runtime configuration (got: '$json')" ;;
esac

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed. Last 30 lines of the web log:"
  docker compose logs --tail=30 web
  exit 1
fi
echo "All 4 checks passed. Open http://localhost:${port:-8080} in a browser."
