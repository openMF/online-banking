# syntax=docker/dockerfile:1
# Multi-stage build: Node builds the app, Nginx serves static assets.
# Suitable for the client-side banking UI demonstration.

# -----------------------------------------------------------------------------
# Stage 1 — build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Application sources
COPY . .

# Self Service Plugin connection (baked into client via Vite)
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
    SELF_SERVICE_TENANT_ID=$VITE_SELF_SERVICE_TENANT_ID

# Production build. The project uses Vite + TanStack Start; client assets land
# under dist/ (or .output/public depending on Nitro preset). We normalize below.
ENV NODE_ENV=production
RUN npm run build || npm run build:dev

# Collect static files into /out for the Nginx stage
RUN mkdir -p /out \
  && if [ -d dist/client ]; then cp -a dist/client/. /out/; \
     elif [ -d dist ]; then cp -a dist/. /out/; \
     elif [ -d .output/public ]; then cp -a .output/public/. /out/; \
     elif [ -d build/client ]; then cp -a build/client/. /out/; \
     elif [ -d build ]; then cp -a build/. /out/; \
     else echo "No static build output found" && ls -la && exit 1; fi \
  && if [ ! -f /out/index.html ]; then \
       find /out -name "index.html" -type f | head -1 | xargs -I{} cp {} /out/index.html || true; \
     fi

# -----------------------------------------------------------------------------
# Stage 2 — Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Mifos Online Banking"
LABEL org.opencontainers.image.description="Demo electronic banking channel (Nginx static)"
LABEL org.opencontainers.image.source="https://github.com/openMF/online-banking"

# Remove default site and install our config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static site from builder
COPY --from=builder /out /usr/share/nginx/html

# Non-root friendly: nginx master still needs root to bind :80 in stock image;
# containers typically run as root for the master process. Expose 80.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
