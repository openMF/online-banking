# Multi-stage build for the Vite React app (vite-plugin-singlefile: one index.html plus public/)
# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve static files with nginx
FROM nginx:1.31.7-alpine

# Remove default nginx static assets
RUN apk add --no-cache nodejs && rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: SPA fallback, security headers, cache rules and /health
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Node runs only the startup generator, sharing the browser validation (Node >=22.6).
# The official Nginx entrypoint runs executable scripts before starting Nginx.
# The generator loads src/lib/self-service-config.ts with plain Node, so that file must not import
# anything: only this one file is copied here (tests/self-service-config.mjs checks the same set).
COPY package.json /opt/self-service/package.json
COPY src/lib/self-service-config.ts /opt/self-service/src/lib/self-service-config.ts
COPY docker/generate-runtime-config.mjs /opt/self-service/docker/generate-runtime-config.mjs
COPY --chmod=755 docker/40-self-service-config.sh /docker-entrypoint.d/40-self-service-config.sh

EXPOSE 80

# start-period covers the entrypoint scripts (the configuration is written before Nginx starts).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
