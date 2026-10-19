# Multi-stage build for Vite React app (with singlefile plugin)
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
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional: custom nginx config for SPA (fallback to index.html)
# Since this uses vite-plugin-singlefile, output is typically a single HTML + assets
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
