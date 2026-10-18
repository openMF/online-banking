# syntax=docker/dockerfile:1
# Multi-stage build: Node builds the SSR app, Node serves it.

# -----------------------------------------------------------------------------
# Stage 1 — build
# -----------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Prevent Playwright from downloading browser binaries on Alpine (musl incompatibility)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

COPY . .

ARG VITE_SELF_SERVICE_BASE_URL=https://demo.mifos.community
ARG VITE_SELF_SERVICE_ENDPOINT=/fineract-provider/api
ARG VITE_SELF_SERVICE_API_KEY=
ARG VITE_SELF_SERVICE_TENANT_ID=default
ENV VITE_SELF_SERVICE_BASE_URL=$VITE_SELF_SERVICE_BASE_URL \
    VITE_SELF_SERVICE_ENDPOINT=$VITE_SELF_SERVICE_ENDPOINT \
    VITE_SELF_SERVICE_API_KEY=$VITE_SELF_SERVICE_API_KEY \
    VITE_SELF_SERVICE_TENANT_ID=$VITE_SELF_SERVICE_TENANT_ID \
    SELF_SERVICE_BASE_URL=$VITE_SELF_SERVICE_BASE_URL \
    SELF_SERVICE_ENDPOINT=$VITE_SELF_SERVICE_ENDPOINT \
    SELF_SERVICE_API_KEY=$VITE_SELF_SERVICE_API_KEY \
    SELF_SERVICE_TENANT_ID=$VITE_SELF_SERVICE_TENANT_ID \
    NITRO_PRESET=node

# [FIX] Patch vite.config.ts to use the 'node' preset instead of 'vercel'.
# This ensures TanStack Start outputs a standalone Node.js server to .output/
# instead of Vercel serverless functions to .vercel/output/.
RUN sed -i 's/preset: "vercel",/preset: "node",/g' vite.config.ts && \
    sed -i 's/server: {/server: {\n        preset: "node",/g' vite.config.ts

ENV NODE_ENV=production
# Run the build
RUN npm run build || npm run build:dev

# -----------------------------------------------------------------------------
# Stage 2 — Node.js Runtime
# -----------------------------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

# Copy the compiled Nitro node server output
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Configure Nitro to listen on port 80
ENV PORT=80
ENV HOST=0.0.0.0
EXPOSE 80

# Healthcheck using wget (available in alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
