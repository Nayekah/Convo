FROM oven/bun:1.2.18-alpine AS frontend-build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package.json frontend/bun.lock frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/eslint.config.js frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src

RUN bun install --frozen-lockfile
RUN bun run build

FROM caddy:2-alpine

COPY reverse-proxy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-build /app/dist /srv
