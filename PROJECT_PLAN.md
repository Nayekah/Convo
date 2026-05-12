# Convo Project Plan

## 1. Confirmed Decisions

This plan is based on the current codebase.

- Password hashing stays **scrypt + per-user salt**. The spec allows any password hashing algorithm.
- Browser JWT transport uses a **`__Host-convo_access_token` HttpOnly cookie** set with `hono/cookie`.
- Backend auth middleware reads the HttpOnly cookie first and keeps `Authorization: Bearer <token>` as a compatibility fallback for non-browser tools.
- The JWT library keeps **ES256, ES384, and ES512** support because the spec table requires those algorithms. The application itself only issues and accepts **ES256** tokens.
- JWT unit tests stay on **Node.js `node:test`**. The JWT bonus allows any unit test framework.
- Client crypto must use **Web Crypto API** for ECDH, HKDF, AES, and HMAC-related operations.
- Keep **PBKDF2** and **HKDF** because they solve different problems:
  - PBKDF2 derives a key from the user's password to encrypt the user's stored private ECDH key.
  - HKDF derives chat encryption/MAC keys from the ECDH shared secret.
- Keep **AES-256-GCM + HMAC-SHA-256**:
  - AES-GCM gives modern authenticated encryption.
  - HMAC is added to satisfy the MAC bonus and is verified before decryption.

## 2. Current Status

### Done

- React + Vite frontend with landing, sign-up, and sign-in pages.
- Hono REST auth API for sign-up, sign-in, and current-user lookup.
- Prisma + PostgreSQL user storage.
- Client-side ECDH P-256 key generation during sign-up.
- Client-side AES-256-GCM encryption of the exported private ECDH key.
- Client-side PBKDF2-SHA-256 for private-key wrapping.
- Server-side scrypt password hashing with unique salt.
- Custom JWT library with `sign` and `verify`.
- JWT tests with `node:test`; current suite passes.
- Contact list REST API excluding the current user.
- One-to-one conversation creation/lookup REST API with stable ordered participants.
- Encrypted message history REST API with participant authorization.
- Prisma `Conversation` and `Message` schema plus migration.
- Backend WebSocket endpoint at `/api/ws`.
- WebSocket authentication with the same ES256 JWT verifier.
- REST auth uses `hono/cookie` to set and read an HttpOnly `__Host-convo_access_token` cookie.
- Active WebSocket connection tracking by user ID.
- Encrypted WebSocket message persistence and broadcast to sender/receiver.
- Docker Compose, backend Dockerfile, frontend Dockerfile, and Nginx reverse proxy.

### Needs Revision

- Add deployment-oriented env notes and VPS run commands.

### Not Implemented

- Private ECDH key decryption after login.
- ECDH shared-secret derivation for chat.
- HKDF key separation for AES/HMAC chat keys.
- AES-256-GCM message encryption/decryption.
- HMAC-SHA-256 Encrypt-then-MAC bonus.
- Frontend WebSocket real-time chat integration.
- Invalid-MAC and decrypt-failed UI states.
- Automated tests for auth routes, chat REST APIs, WebSocket message flow, and frontend crypto helpers.
- Full required report and video demo evidence.

## 3. Tech Stack and Crypto Flow

### Stack

- Client: React, Vite, TypeScript, Web Crypto API.
- Server: Hono on Node.js, custom JWT library, Prisma ORM.
- Realtime: WebSocket endpoint on the Hono backend.
- Database: PostgreSQL.
- DevOps: Docker Compose and Nginx reverse proxy.
- Testing: Node.js `node:test` for JWT library tests; manual/demo tests for full assignment flows.

### Registration Flow

1. User enters email and password.
2. Browser generates an ECDH P-256 key pair with Web Crypto API.
3. Browser exports the private key as PKCS#8 and public key as SPKI.
4. Browser derives a wrapping key from the password using PBKDF2-SHA-256.
5. Browser encrypts the exported private key with AES-256-GCM.
6. Browser sends email, password, public key, encrypted private key, IV, salt, iteration count, and algorithm metadata to the server.
7. Server hashes the password with scrypt and stores only the hash, salt, public key, encrypted private key, and metadata.
8. Server signs an ES256 JWT, sets it in the HttpOnly auth cookie, and returns the sanitized user data.

### Login Flow

1. User enters email and password.
2. Server verifies the password with scrypt.
3. Server sets an ES256 JWT in an HttpOnly `__Host-convo_access_token` cookie and returns the encrypted private-key metadata.
4. Browser sends the cookie automatically on credentialed API requests.
5. Browser keeps the password only long enough to decrypt the private ECDH key locally.

### Chat Key Flow

1. User selects a contact.
2. Browser fetches the contact's public ECDH key and the conversation `hkdfSalt`.
3. Browser decrypts its own private ECDH key if it is not already available in memory.
4. Browser derives an ECDH shared secret.
5. Browser runs HKDF-SHA-256 over the shared secret and conversation salt.
6. HKDF output is split into:
   - 32-byte AES-256-GCM key.
   - 32-byte HMAC-SHA-256 key.

### Message Flow

1. Sender creates a fresh 96-bit AES-GCM IV.
2. Sender encrypts plaintext with AES-256-GCM.
3. Sender builds a canonical encrypted envelope containing version, conversation ID, sender ID, receiver ID, IV, ciphertext, and timestamp.
4. Sender computes HMAC-SHA-256 over the encrypted envelope.
5. Sender sends only encrypted envelope + MAC to the server.
6. Receiver verifies HMAC first.
7. If MAC fails, UI shows `Message invalid`.
8. If MAC passes but AES-GCM decrypt fails, UI shows `Message cannot be decrypted`.
9. If decrypt succeeds, UI shows plaintext.

## 4. Practical Implementation Steps

### Step 2: Add Backend REST APIs

Status: **Done**.

- Added `GET /api/contacts`.
  - Auth required.
  - Returns all users except current user.
  - Returns only `id`, `email`, and `publicKey`.

- Added `POST /api/conversations`.
  - Auth required.
  - Body: `{ contactId: string }`.
  - Validates contact exists and is not current user.
  - Gets or creates ordered one-to-one conversation.
  - Returns conversation ID, contact info, contact public key, and `hkdfSalt`.

- Added `GET /api/conversations/:conversationId/messages`.
  - Auth required.
  - Validates current user belongs to the conversation.
  - Returns encrypted message envelopes only.

- Auth middleware reads the HttpOnly cookie first and accepts only ES256 app tokens:

```ts
algs: ['ES256']
```

### Step 3: Add Backend WebSocket Chat

Status: **Done**.

- Added a WebSocket endpoint at `/api/ws`.
- Authenticates the WebSocket connection using the same ES256 JWT verifier.
  - Supports the `__Host-convo_access_token` cookie for browser clients.
  - Supports `Authorization: Bearer <token>` for non-browser clients.
  - Supports a `bearer` WebSocket subprotocol plus token value as a compatibility fallback.
  - Supports `?token=<jwt>` as a local/debug fallback, not as the preferred browser flow.
- Tracks active connections by user ID.
- Accepts client event:

```json
{
  "type": "message:send",
  "conversationId": "...",
  "receiverId": "...",
  "ciphertext": "...",
  "iv": "...",
  "mac": "...",
  "algorithm": "ECDH-P256+HKDF-SHA256+AES-256-GCM+HMAC-SHA256",
  "sentAt": "2026-05-08T00:00:00.000Z"
}
```

- Server validates sender membership and receiver membership.
- Server stores the encrypted message.
- Server broadcasts the stored encrypted message to sender and receiver if connected.
- Server never decrypts or validates plaintext.

### Step 4: Add Frontend Auth State

- Add a small auth/session module.
- Store authenticated user state client-side; keep the JWT in the HttpOnly cookie.
- Provide a helper for credentialed REST calls.
- Redirect unauthenticated users from contacts/chat pages to sign-in.
- Keep decrypted private key only in memory after login/sign-up. If the page reloads, ask the user to sign in again or re-enter the password before decrypting messages.

### Step 5: Extend Frontend Crypto Helpers

Add Web Crypto helpers in `frontend/src/lib/crypto-api.ts` or split into focused files:

- `decryptPrivateKey(password, encryptedPrivateKeyMetadata)`.
- `importPrivateEcdhKey(pkcs8Bytes)`.
- `importPublicEcdhKey(spkiBytes)`.
- `deriveSharedSecret(privateKey, publicKey)`.
- `deriveChatKeys(sharedSecret, hkdfSalt)`.
- `encryptMessage(plaintext, aesKey)`.
- `decryptMessage(ciphertext, iv, aesKey)`.
- `signEnvelope(envelope, hmacKey)`.
- `verifyEnvelopeMac(envelope, mac, hmacKey)`.

Encoding rule: keep binary data in base64url strings to match current key encoding style.

### Step 6: Add Frontend Contacts and Chat UI

- Add route `/contacts`.
  - Fetch contacts.
  - Show email list.
  - Selecting a contact calls `POST /api/conversations`.
  - Navigate to `/chat/:conversationId`.

- Add route `/chat/:conversationId`.
  - Load conversation metadata and encrypted message history.
  - Derive chat keys before displaying messages.
  - Verify/decrypt each message on the client.
  - Connect to `/api/ws`.
  - Send encrypted messages over WebSocket.
  - Render states:
    - own message,
    - received message,
    - pending/send failure,
    - invalid MAC,
    - decrypt failed.

### Step 7: Update Dockerfiles for Deployment

- Backend Dockerfile:
  - use a build stage,
  - install dependencies,
  - run Prisma generate,
  - run TypeScript build,
  - final image runs `bun run start`,
  - run `prisma migrate deploy` before backend start through entrypoint or deploy command.

- Frontend Dockerfile:
  - keep build stage with `VITE_API_BASE_URL=/api`,
  - keep Nginx static serving,
  - verify SPA fallback is configured in `frontend/nginx.prod.conf`.

- Nginx reverse proxy:
  - keep `/api/*` proxy to backend,
  - keep WebSocket upgrade headers for `/api/ws`,
  - keep frontend fallback through frontend container.

## 5. VPS Deployment Plan

Recommended VPS topology:

1. Docker Compose runs app services on the VPS.
2. Compose Nginx reverse proxy listens on `127.0.0.1:4021`.
3. Host-level Nginx or Caddy terminates HTTPS and proxies the public domain to `127.0.0.1:4021`.
4. VPS firewall exposes only SSH, HTTP, and HTTPS.

Production `.env.production`:

```env
PUBLIC_ORIGIN=https://your-domain.example
FRONTEND_ORIGIN=https://your-domain.example
POSTGRES_DB=convo_db
POSTGRES_USER=convo
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgres://convo:<strong-password>@postgres:5432/convo_db
NODE_ENV=production
PORT=9173
JWT_ISSUER=convo-auth
JWT_AUDIENCE=convo-web
JWT_ACCESS_TOKEN_TTL_SECONDS=3600
JWT_PRIVATE_KEY="<production-private-key>"
JWT_PUBLIC_KEY="<production-public-key>"
VITE_API_BASE_URL=/api
APP_HOST_BIND=127.0.0.1
APP_PORT=4021
BACKEND_HOST_BIND=127.0.0.1
POSTGRES_HOST_BIND=127.0.0.1
```

Deployment commands:

```bash
docker compose --env-file .env.production up --build -d
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f backend
```

Operational tasks:

- Generate fresh JWT keys for production.
- Never commit `.env.production` or real private keys.
- Run database migrations before or during backend startup.
- Back up PostgreSQL with `pg_dump` or volume backups.
- Document restore steps before final deployment.

## 6. Testing Plan

### Automated Tests

- Keep JWT tests in `backend/src/lib/jwt.test.ts` using `node:test`.
- JWT test coverage must include:
  - sign happy path for ES256, ES384, ES512,
  - verify happy path,
  - at least five sign edge cases,
  - at least five verify edge cases,
  - wrong key,
  - invalid token format,
  - expired `exp`,
  - invalid future `nbf`,
  - tampered header/payload/signature.

Add practical tests where feasible:

- Backend auth tests:
  - valid registration,
  - duplicate email,
  - valid login,
  - wrong password,
  - protected route without JWT,
  - protected route with invalid JWT.

- Backend chat API tests:
  - contacts exclude current user,
  - conversation creation is idempotent,
  - current user cannot create conversation with self,
  - message history rejects non-participants,
  - stored messages contain no plaintext field.

- Frontend crypto tests:
  - two generated ECDH key pairs derive matching shared secret,
  - HKDF derives stable AES/HMAC keys for same inputs,
  - AES-GCM decrypts correct ciphertext,
  - AES-GCM fails with wrong key or IV,
  - HMAC verification fails after ciphertext or envelope tampering.

### Manual Demo Tests

Use these for the report and video:

1. Register Alice successfully.
2. Register Bob successfully.
3. Try duplicate Alice email and show rejection.
4. Login Alice with correct password and show JWT issued.
5. Login Alice with wrong password and show rejection.
6. Show contacts page where Alice sees Bob but not herself.
7. Open Alice-Bob chat and show ECDH/HKDF key derivation works.
8. Send encrypted message from Alice to Bob.
9. Show server/database stores ciphertext, IV, and MAC, not plaintext.
10. Show Bob decrypts the message into plaintext.
11. Tamper ciphertext or MAC and show invalid/decrypt-failed UI.
12. Run app through Docker Compose.

## 7. Final Deliverables

- Updated backend and frontend implementation.
- Updated Prisma schema and migration.
- Updated `docker-compose.yml`.
- Updated README with local development, full Docker, and VPS notes.
- JWT unit tests passing.
- Report PDF containing:
  - theory for JWT, ECDH, PBKDF2, HKDF, AES-GCM, HMAC,
  - implementation design with relevant file references,
  - testing evidence,
  - Docker/deployment explanation,
  - conclusion,
  - bibliography,
  - repository link,
  - direct video demo link,
  - task division.
- GitHub release before submission.
