# Convo Backend

The Convo backend is a Bun, Hono, TypeScript, and Prisma service that provides authentication, key-metadata storage, conversation APIs, encrypted message persistence, and WebSocket delivery for the Convo web client.

## Responsibilities

- Register users with email, password hash, password salt, ECDH public key, encrypted ECDH private key, and key-recovery metadata
- Authenticate users with salted scrypt password verification
- Issue ES256 JWT access tokens in the `__Host-convo_access_token` `HttpOnly` cookie
- Verify access tokens for protected HTTP routes and the chat WebSocket
- Expose contacts, conversation creation, and encrypted message history APIs
- Persist encrypted message envelopes without plaintext access
- Relay encrypted message envelopes through `/api/ws`

## Tech Stack

- Bun runtime
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- Node `crypto`
- Node `node:test` for JWT unit tests
- Custom JWT library with ES256, ES384, and ES512 support

The assignment requires ES256, ES384, and ES512 support in the JWT library. The application authentication flow itself issues and accepts ES256 tokens only.

## Environment

The backend reads environment variables from the repository root `.env` file:

```bash
cd ..
cp .env.example .env
```

Important variables:

- `NODE_ENV`
- `DATABASE_URL`
- `FRONTEND_ORIGIN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`

Notes:

- `FRONTEND_ORIGIN` accepts a comma-separated allowlist
- In `NODE_ENV=development`, `http://localhost:4021` and `http://127.0.0.1:4021` are accepted automatically
- In Docker, environment values come from the root `docker-compose.yml`

## How to Run

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Then run the backend:

```bash
cd backend
bun install
bun run db:generate
bun run db:push
bun run dev
```

Development URL:

```text
http://localhost:9173
```

In the Docker stack, the public app should call the backend through `/api/*` via the Caddy reverse proxy at `https://localhost`.

## API Routes

The backend is mounted under `/api`.

```text
POST /api/auth/signup
POST /api/auth/signin
GET  /api/auth/me
GET  /api/contacts
POST /api/conversations
GET  /api/conversations/{conversationId}/messages
GET  /api/ws
```

Authentication behavior:

- Browser clients use the `__Host-convo_access_token` cookie
- Non-browser tools may use `Authorization: Bearer <access-token>`
- The WebSocket also accepts the access token through cookie, bearer header, subprotocol fallback, or query parameter

## Authentication Flow

Sign-up:

1. The frontend generates ECDH key material with Web Crypto API.
2. The frontend derives a private-key wrapping key with PBKDF2-SHA-256.
3. The frontend encrypts the ECDH private key with AES-256-GCM before submission.
4. The backend hashes the password with scrypt and a unique salt.
5. The backend stores the public key, encrypted private key, and private-key encryption metadata.
6. The backend sets a signed JWT access token in an `HttpOnly` cookie.

Sign-in:

1. The backend looks up the user by email.
2. The backend verifies the submitted password against the stored salted scrypt hash.
3. The backend sets a new signed JWT access token in an `HttpOnly` cookie.
4. The backend returns sanitized user data and encrypted private-key metadata.

Protected access:

1. The browser sends the JWT in the `HttpOnly` cookie.
2. The backend verifies the token with `JWT_PUBLIC_KEY`.
3. Only ES256 application tokens are accepted.
4. The decoded authentication payload is attached to the request context.

## Secure Messaging Flow

1. The backend returns peer public keys and conversation metadata.
2. The client derives ECDH and HKDF chat keys in the browser.
3. The backend receives only ciphertext, IV, MAC, sender or receiver IDs, and timestamps.
4. The backend stores encrypted envelopes and relays them over WebSocket.
5. The backend never receives plaintext messages, ECDH shared secrets, AES keys, or HMAC keys.

## JWT Library

The custom JWT implementation is in:

```text
src/lib/jwt.ts
```

It implements:

- `sign`
- `verify`
- ES256, ES384, and ES512
- Base64url compact serialization
- Registered claim validation for `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, and `jti`

JWT unit tests are in:

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

Main tables:

- `User`: email, password hash, password salt, public key, encrypted private key, private-key metadata, timestamps
- `Conversation`: ordered one-to-one user pair, HKDF salt, timestamps
- `Message`: conversation ID, sender ID, receiver ID, ciphertext, IV, MAC, algorithm metadata, timestamp

No plaintext message column is stored.

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
  ws/             Chat WebSocket authentication and event handling
  index.ts        Bun server entrypoint
```

## Production Notes

The backend container runs on the Bun runtime and exposes port `9173` only inside Docker networking. Caddy is the public entrypoint and forwards `/api/*` requests to the backend.
