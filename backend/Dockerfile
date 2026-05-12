FROM oven/bun:1.2.18-alpine AS deps

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
COPY prisma ./prisma

RUN bun install --frozen-lockfile
RUN bun run db:generate

FROM oven/bun:1.2.18-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/prisma ./prisma
COPY src ./src
COPY tsconfig.json ./tsconfig.json

EXPOSE 9173

CMD ["sh", "-c", "bun run db:migrate && bun src/index.ts"]
