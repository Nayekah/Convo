# Convo Frontend

The Convo frontend is a React, Vite, and TypeScript application for the web chat client. It provides the landing page, sign-up flow, sign-in flow, client-side cryptographic key preparation, and planned encrypted chat UI required by the assignment.

## Responsibilities

- Render the public landing page and authentication pages.
- Generate the user's ECDH key pair during sign-up with the Web Crypto API.
- Derive a private-key wrapping key with PBKDF2-SHA-256.
- Encrypt the exported ECDH private key with AES-256-GCM before sending it to the backend.
- Send authentication requests to the backend through the `/api` reverse-proxy path.
- Rely on the backend-issued `HttpOnly` authentication cookie for authenticated requests.
- Planned: derive chat keys with ECDH + HKDF, encrypt messages with AES-256-GCM, and verify HMAC-SHA-256 before decrypting received messages.

## Tech Stack

- React
- Vite
- TypeScript
- React Router
- Web Crypto API
- ESLint
- Prettier from the repository root

JWTs are sent to the backend as `Authorization: Bearer <token>`. Cookie storage is allowed by the assignment, but is not required by the current implementation.

## Environment

The project uses a single environment template at the repository root:

```bash
cd ..
cp .env.example .env
```

The frontend reads `VITE_API_BASE_URL` from the root `.env`. The default value is:

```env
VITE_API_BASE_URL=/api
```

This value is intentionally relative. In Docker, Caddy routes `/api/*` to the backend. In local development, Vite proxies `/api/*` to `http://localhost:9173`.

## Local Development

Start the backend first, then run the frontend:

```bash
cd frontend
bun install
bun run dev
```

The development server runs at:

```text
http://localhost:4021
```

Available pages:

- `/`
- `/signin`
- `/signup`

Planned pages:

- `/contacts`
- `/chat/:conversationId`

## Production Container

The frontend Dockerfile is production-oriented:

1. Build the Vite app with Bun.
2. Copy the generated `dist` output into an Nginx image.
3. Serve the static app on container port `4021`.

The frontend container is not intended to be exposed directly. The root reverse proxy is the public entrypoint and forwards regular page requests to this service.

For VPS deployment, the Compose reverse proxy should usually bind to `127.0.0.1:4021`, with host-level Nginx or Caddy handling HTTPS and proxying to it.

## Scripts

```bash
bun run dev
bun run build
bun run lint
bun run preview
```

## Source Layout

```text
src/
  components/     Shared UI components
  lib/            API, metadata, base64url, and crypto helpers
  pages/          Route-level pages
  types/          Shared frontend TypeScript types
  App.tsx         Route composition
  main.tsx        React entrypoint
```

## Cryptography Notes

During sign-up, the frontend generates an ECDH P-256 key pair. The public key and encrypted private key material are sent to the backend. The backend must never receive the plaintext ECDH private key.

The private key encryption flow uses:

- PBKDF2 with SHA-256 to derive a wrapping key from the user's password.
- AES-256-GCM to encrypt the exported private key.
- Base64url encoding for transport-safe key material.

Planned chat cryptography:

- Import the current user's decrypted ECDH private key.
- Fetch the peer user's ECDH public key from the backend.
- Derive a shared secret with ECDH P-256.
- Use HKDF-SHA-256 to derive separate AES-256-GCM and HMAC-SHA-256 keys.
- Encrypt outgoing plaintext with AES-256-GCM and a fresh IV.
- Compute HMAC-SHA-256 over the encrypted message envelope.
- Verify HMAC before decryption.
- Show `Message invalid` when MAC verification fails.
- Show `Message cannot be decrypted` when decryption fails.
