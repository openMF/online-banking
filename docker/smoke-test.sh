#!/bin/sh
# Starts the built image the way a deployment does and checks what a user and an orchestrator see.
# CI runs it after `docker build`; run it yourself with:
#
#   docker build -t online-banking:smoke . && sh docker/smoke-test.sh online-banking:smoke
#
# The unit tests load the configuration generator with plain Node, which is not what runs in the
# container: this is the check that the image starts, serves, and refuses a wrong configuration.
set -eu

IMAGE="${1:-online-banking:smoke}"
PREFIX="ob-smoke-$$"
failures=0

cleanup() { docker rm -f "$PREFIX-demo" "$PREFIX-config" "$PREFIX-invalid" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

ok() { echo "ok   $1"; }
fail() { echo "FAIL $1"; failures=$((failures + 1)); }
check() { # check "description" expected actual
  if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (expected '$2', got '$3')"; fi
}

# start NAME [docker run options...]: publishes a free local port and waits for /health
start() {
  name="$PREFIX-$1"
  shift
  docker run -d --name "$name" -p 127.0.0.1::80 "$@" "$IMAGE" >/dev/null
  port=$(docker port "$name" 80/tcp | head -n 1 | sed 's/.*://')
  i=0
  until [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/health" || true)" = "200" ]; do
    i=$((i + 1))
    if [ "$i" -gt 30 ]; then
      echo "the container $name did not answer /health in 30 s; its log:" >&2
      docker logs "$name" 2>&1 | tail -n 20 >&2
      exit 1
    fi
    sleep 1
  done
  echo "$port"
}

echo "== standalone demo (no configuration)"
port=$(start demo)
base="http://127.0.0.1:$port"
check "/health answers ok" "ok" "$(curl -s "$base/health")"
check "/health has one Content-Type, text/plain" "text/plain" \
  "$(curl -sI "$base/health" | tr -d '\r' | grep -i '^content-type:' | sed 's/^[^:]*: *//' | tr '\n' ',' | sed 's/,$//')"
check "/ is served" "200 text/html" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/")"
check "a client-side route falls back to the app" "200 text/html" \
  "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$base/some/route")"
check "a missing asset is a 404, not the app" "404" "$(curl -s -o /dev/null -w '%{http_code}' "$base/missing.js")"
check "the runtime configuration is null (demo only)" "null" "$(curl -s "$base/runtime-config.json")"
check "the runtime configuration is never cached" "no-store" \
  "$(curl -sI "$base/runtime-config.json" | tr -d '\r' | grep -i '^cache-control:' | sed 's/^[^:]*: *//')"
headers=$(curl -sI "$base/favicon.svg" | tr -d '\r')
check "a static asset has one Cache-Control" "1" "$(echo "$headers" | grep -ic '^cache-control:')"
check "a static asset keeps the security headers" "3" \
  "$(echo "$headers" | grep -icE '^(x-frame-options|x-content-type-options|referrer-policy):')"
check "the page is compressed" "gzip" \
  "$(curl -sI -H 'Accept-Encoding: gzip' "$base/" | tr -d '\r' | grep -i '^content-encoding:' | sed 's/^[^:]*: *//')"
check "the container reports healthy" "healthy" "$(
  i=0
  while [ "$i" -lt 20 ]; do
    s=$(docker inspect -f '{{.State.Health.Status}}' "$PREFIX-demo")
    [ "$s" = "healthy" ] && break
    i=$((i + 1))
    sleep 2
  done
  echo "$s"
)"

echo "== with a Self Service configuration"
url="https://bank.example/fineract-provider/api/v1/self"
port=$(start config -e "SELF_SERVICE_BASE_URL=$url" -e SELF_SERVICE_TENANT_ID=default)
check "the configuration is written for the browser" "{\"baseUrl\":\"$url\",\"tenantId\":\"default\"}" \
  "$(curl -s "http://127.0.0.1:$port/runtime-config.json")"

echo "== with a wrong configuration"
docker run -d --name "$PREFIX-invalid" -e SELF_SERVICE_BASE_URL=http://bank.example/x -e SELF_SERVICE_TENANT_ID=default \
  "$IMAGE" >/dev/null
i=0
while [ "$(docker inspect -f '{{.State.Running}}' "$PREFIX-invalid")" = "true" ] && [ "$i" -lt 20 ]; do
  i=$((i + 1))
  sleep 1
done
check "the container refuses to start" "false" "$(docker inspect -f '{{.State.Running}}' "$PREFIX-invalid")"
check "and says why" "1" "$(docker logs "$PREFIX-invalid" 2>&1 | grep -c 'requires HTTPS')"

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "all checks passed"
