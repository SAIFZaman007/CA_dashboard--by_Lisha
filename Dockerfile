# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------------------
# Coach Auto — Dashboard
# Build:  docker build -t coach-auto-dashboard ./dashboard
# Run:    docker run -p 8080:8080 coach-auto-dashboard
# ------------------------------------------------------------------------------

# --- build --------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy the manifests alone first so `npm ci` is cached until a dependency
# actually changes, not on every source edit.
COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time, so these are ARGs, not runtime env.
# On Coolify set them under "Build Variables".
ARG VITE_API_URL=""
ARG VITE_DASHBOARD_URL=""
ARG VITE_PORTAL_URL=""
ARG VITE_ENVIRONMENT="production"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL \
    VITE_PORTAL_URL=$VITE_PORTAL_URL \
    VITE_ENVIRONMENT=$VITE_ENVIRONMENT

RUN npm run build

# --- runtime ------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/coach-auto-dashboard.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]