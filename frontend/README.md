# Convo Frontend

The Convo frontend is a React, Vite, and TypeScript application for the web chat client. It provides the landing page, sign-up flow, sign-in flow, and client-side cryptographic key preparation required by the assignment.

## Responsibilities

- Render the public landing page and authentication pages.
- Generate the user's ECDH key pair during sign-up with the Web Crypto API.
- Encrypt the exported ECDH private key before sending it to the backend.
- Send authentication requests to the backend through the `/api` reverse-proxy path.
- Rely on the backend-issued `HttpOnly` authentication cookie for authenticated requests.

## Tech Stack

- React
- Vite
- TypeScript
- React Router
- Web Crypto API
- ESLint
- Prettier from the repository root

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

## Production Container

The frontend Dockerfile is production-oriented:

1. Build the Vite app with Bun.
2. Copy the generated `dist` output into an Nginx image.
3. Serve the static app on container port `4021`.

The frontend container is not intended to be exposed directly. The root reverse proxy is the public entrypoint and forwards regular page requests to this service.

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
