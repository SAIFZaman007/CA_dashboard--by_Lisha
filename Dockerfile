# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------------------
# Coach Auto — Dashboard
# Build:  docker build -t coach-auto-dashboard ./dashboard
# Run:    docker run -p 8080:8080 coach-auto-dashboard
# ------------------------------------------------------------------------------

# --- build --------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=""
ARG VITE_DASHBOARD_URL="https://coach.autonomyfitness.press"
ARG VITE_PORTAL_URL="https://autonomyfitness.press"
ARG VITE_ENVIRONMENT="production"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_DASHBOARD_URL=$VITE_DASHBOARD_URL \
    VITE_PORTAL_URL=$VITE_PORTAL_URL \
    VITE_ENVIRONMENT=$VITE_ENVIRONMENT

RUN npm run build

# --- runtime ------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
ENV NGINX_ENVSUBST_FILTER="^(API_ORIGIN|API_UPSTREAM)$$"

ENV API_ORIGIN=""
ENV API_UPSTREAM="http://api:8000"

COPY nginx.conf.template /etc/nginx/templates/coach-auto-dashboard.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]