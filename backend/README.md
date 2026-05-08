# Convo Backend

The Convo backend is a Hono, TypeScript, and Prisma service that handles authentication, user key metadata storage, password hashing, and JWT issuance for the Convo web client.

## Responsibilities

- Register users with email, password hash, password salt, ECDH public key, encrypted ECDH private key, and key-recovery metadata.
- Authenticate users with salted password verification.
- Issue JWS JWT access tokens signed with the custom ES256 JWT library in `HttpOnly` cookies.
- Verify access tokens for protected routes.
- Store user records in PostgreSQL through Prisma.

## Tech Stack

- Bun runtime
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- Node `crypto`
- Custom JWT library with ES256, ES384, and ES512 support

## Environment

The backend reads environment variables from the repository root `.env` file. Start by creating it from the root template:

```bash
cd ..
cp .env.example .env
```

Required variables include:

- `DATABASE_URL`
- `FRONTEND_ORIGIN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`

When running through Docker Compose, the backend receives its environment from the root `docker-compose.yml`. When running the backend directly, `src/configs/env.config.ts` loads the root `.env` file explicitly.

## Local Development

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Then run the backend:

```bash
cd backend
bun install
bun run db:push
bun run dev
```

The backend runs at:

```text
http://localhost:9173
```

The public Docker application should call the backend through `/api/*` via the HTTPS reverse proxy at `https://localhost`.

## API Routes

The backend is mounted under `/api`.

```text
POST /api/auth/signup
POST /api/auth/signin
GET  /api/auth/me
```

`GET /api/auth/me` requires the `__Host-convo_access_token` cookie. Bearer tokens are still accepted for development tooling:

```text
Authorization: Bearer <access-token>
```

## Authentication Flow

Sign-up:

1. The frontend generates ECDH key material with Web Crypto API.
2. The frontend encrypts the ECDH private key before submission.
3. The backend hashes the password with a unique salt.
4. The backend stores the public key, encrypted private key, and private-key encryption metadata.
5. The backend sets a signed JWT access token in an `HttpOnly` cookie.

Sign-in:

1. The backend looks up the user by email.
2. The backend verifies the submitted password against the stored salted hash.
3. The backend sets a new signed JWT access token in an `HttpOnly` cookie.

Protected route access:

1. The browser sends the JWT in the `HttpOnly` `__Host-convo_access_token` cookie.
2. The auth middleware verifies the token with `JWT_PUBLIC_KEY`.
3. The decoded token payload is attached to the request context.

## JWT Library

The custom JWT implementation is located in:

```text
src/lib/jwt.ts
```

It implements:

- `sign`
- `verify`
- ES256, ES384, and ES512
- Base64url compact serialization
- RFC 7519 section 7.2 validation behavior relevant to JWS
- Registered claim validation for `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, and `jti`

JWT unit tests are located in:

```text
src/lib/jwt.test.ts
```

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run test
bun run test:jwt
bun run db:generate
bun run db:migrate
bun run db:push
```

## Database

Prisma schema and migrations are stored in:

```text
prisma/
```

The main user table stores:

- email
- password hash
- password salt
- ECDH public key
- encrypted ECDH private key
- private-key IV
- private-key salt
- private-key KDF metadata
- private-key cipher metadata

## Source Layout

```text
src/
  configs/        Environment validation
  controllers/    HTTP handlers and router composition
  db/             Prisma client
  lib/            Reusable libraries such as JWT
  middlewares/    Request middleware
  repositories/   Database access functions
  routes/         OpenAPI route definitions
  types/          Zod schemas and shared backend types
  utils/          Shared helpers
  index.ts        Server entrypoint
```

## Production Notes

The backend container exposes port `9173` only inside Docker networking. The root reverse proxy is the public entrypoint and forwards `/api/*` requests to the backend.

Do not commit real deployment secrets. Generate a fresh JWT key pair and set it in the root `.env` file or the deployment secret manager.
