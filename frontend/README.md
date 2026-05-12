# Convo Frontend

The Convo frontend is a React, Vite, and TypeScript web client for the encrypted chat application. It handles authentication screens, contact selection, conversation loading, client-side cryptography, and encrypted messaging UI.

## Responsibilities

- Render the landing page, sign-up page, sign-in page, contact sidebar, and chat pages
- Generate the user's ECDH keypair in the browser during sign-up
- Derive a wrapping key from the password with PBKDF2-SHA-256
- Encrypt the exported private key with AES-256-GCM before uploading it
- Store the authenticated user profile and encrypted private-key metadata in `sessionStorage`
- Keep the decrypted private key only in memory
- Load contacts and create or reopen one-to-one conversations
- Derive per-conversation chat keys with ECDH and HKDF-SHA-256
- Verify HMAC-SHA-256 before decrypting message history and live messages
- Encrypt outgoing messages and send them through the backend WebSocket

## Tech Stack

- React
- Vite
- TypeScript
- React Router
- Web Crypto API
- ESLint
- Prettier from the repository root

## Environment

The frontend uses the root environment template:

```bash
cd ..
cp .env.example .env
```

Relevant variable:

```env
VITE_API_BASE_URL=/api
```

This stays relative on purpose:

- In Docker, Caddy routes `/api/*` to the backend
- In local development, Vite proxies `/api/*` to `http://localhost:9173`

## How to Run

Start the backend first, then run the frontend:

```bash
cd frontend
bun install
bun run dev
```

Development URL:

```text
http://localhost:4021
```

Available routes:

- `/`
- `/signin`
- `/signup`
- `/chat`
- `/chat/:conversationId`

## Authentication Model

- API requests use `credentials: include`
- Authentication relies on the backend-issued `__Host-convo_access_token` `HttpOnly` cookie
- On `401`, the frontend clears local session data and redirects back to `/signin`

## Production Container

The Docker stack does not run a separate frontend web server container. The reverse-proxy image builds the Vite app and serves the generated static files directly from Caddy.

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
  lib/            API, session, socket, crypto, and helper modules
  pages/          Route-level pages
  types/          Shared frontend TypeScript types
  App.tsx         Route composition
  main.tsx        React entrypoint
```

## Cryptography Notes

During sign-up:

- The frontend generates an ECDH P-256 keypair
- The public key is sent to the backend
- The private key is encrypted locally before upload

The private-key protection flow uses:

- PBKDF2 with SHA-256
- AES-256-GCM
- Base64url-encoded transport data

The chat flow uses:

- ECDH P-256 to derive a shared secret with the peer's public key
- HKDF-SHA-256 to derive separate AES and HMAC keys
- AES-256-GCM to encrypt outgoing messages
- HMAC-SHA-256 to authenticate the encrypted message envelope

If the page reloads, the decrypted private key is gone from memory. The user must unlock it again locally with their password before chat history can be decrypted and the socket can be opened.
