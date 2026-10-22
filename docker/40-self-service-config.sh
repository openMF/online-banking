#!/bin/sh
set -eu
node --experimental-strip-types /opt/self-service/docker/generate-runtime-config.mjs
