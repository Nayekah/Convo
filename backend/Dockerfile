FROM oven/bun:1.2.18-alpine

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN bun install --frozen-lockfile
RUN bun run db:generate

EXPOSE 9173

CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]