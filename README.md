# Convo

> Tugas 3 II4021 Kriptografi 2026

<h3 align="center">End-to-end encrypted web chat with JWT authentication, ECDH key exchange, and AES-based private messaging</h3>

## Overview

`Convo` is a web-based secure messaging application. The project combines user authentication, client-side cryptographic key preparation, and a production-oriented container setup behind a reverse proxy.

The current implementation includes the landing page, sign-up flow, sign-in flow, custom JWT authentication, encrypted ECDH private-key storage, PostgreSQL persistence, Docker orchestration, and JWT unit tests. The chat messaging flow is prepared around the required architecture but is not yet fully implemented.

## Tech Stack and Languages

<p align="center">
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/TypeScript/TypeScript.png" alt="TypeScript" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/React/React.png" alt="React" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/PostgreSQL/PostgreSQL.png" alt="PostgreSQL" width="160"/>
</p>

<p align="center">
  <a href="./frontend">Frontend</a>
  ·
  <a href="./backend">Backend</a>
  ·
  <a href="./LICENSE">License</a>
</p>

## Authors

<div align="center">
  <table>
    <tr>
      <th>NIM</th>
      <th>Name</th>
      <th>GitHub</th>
    </tr>
    <tr align="center">
      <td>13523090</td>
      <td>Nayaka Ghana Subrata</td>
      <td>
        <a href="https://github.com/Nayekah">
          <img src="https://github.com/Nayekah.png" width="48" alt="Nayekah" /><br/>
          <sub><b>@Nayekah</b></sub>
        </a>
      </td>
    </tr>
  </table>
</div>

## About Convo

`Convo` is designed around a server-assisted but privacy-oriented messaging model. The server authenticates users and stores encrypted key material, while cryptographic operations for communication are designed to happen on the client side. During registration, the frontend generates an ECDH key pair with the Web Crypto API. The private key is encrypted before being sent to the backend, and the backend stores only the encrypted private key, public key, and recovery metadata.

Authentication uses a custom JWT library implemented in the backend. Tokens are encoded as JWS compact serialization and signed with ECDSA. The JWT library supports ES256, ES384, and ES512, and includes unit tests for happy paths, invalid token formats, signature failures, claim validation, and RFC 7519 section 7.2 behavior relevant to JWS.

---

## Features

- Landing page
- Sign-up page
- Sign-in page
- Salted password hashing
- Custom JWT sign and verify library
- ES256, ES384, and ES512 support
- JWT unit tests
- Client-side ECDH key generation
- Client-side private-key encryption before upload
- PostgreSQL persistence through Prisma
- Docker Compose full-stack setup
- Nginx reverse proxy
- Production-oriented port isolation
- Husky pre-commit and pre-push quality gates

---

## Project Structure

```text
Convo/
  backend/          Hono API, Prisma, PostgreSQL, JWT library
  frontend/         React, Vite, TypeScript web client
  reverse-proxy/    Nginx public entrypoint
  docker-compose.yml
  .env.example
```

Detailed component documentation:

- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)

---

## Installation & Setup

### Requirements

- Git
- Bun
- Docker
- Docker Compose

> [!IMPORTANT]
> Copy `.env.example` to `.env` before running the application. Do not commit `.env` or real deployment secrets.

### Environment

Create the root environment file:

```bash
cp .env.example .env
```

Before deploying publicly, update at least:

- `PUBLIC_ORIGIN`
- `FRONTEND_ORIGIN`
- `POSTGRES_PASSWORD`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`

The repository uses a single root `.env` file as the source of truth for Docker and local development.

---

## How to Run

### Full Docker Stack

Run the full application stack:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f
```

Stop the stack:

```bash
docker compose down
```

Default access points:

- Public application: `http://localhost:4021`
- Local backend: `http://localhost:9173`
- Local PostgreSQL: `localhost:5532`

Public routing:

- `/` -> frontend static server
- `/api/*` -> backend API

The backend and database ports are bound to `127.0.0.1` by default. The reverse proxy is the public entrypoint.

### Local Development

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run the backend:

```bash
cd backend
bun install
bun run db:push
bun run dev
```

Run the frontend in another terminal:

```bash
cd frontend
bun install
bun run dev
```

The frontend development server proxies `/api/*` to `http://localhost:9173`.

---

## Build

### Backend

```bash
cd backend
bun run build
```

### Frontend

```bash
cd frontend
bun run build
```

### Full Quality Gate

From the repository root:

```bash
bun install
bun run precommit
bun run prepush
```

Husky runs:

- `pre-commit`: format check and frontend lint
- `pre-push`: format check, frontend lint, backend JWT tests, backend build, and frontend build

---

## Supported Workflows

### Authentication

- User registers with email and password.
- Frontend generates an ECDH key pair.
- Frontend encrypts the exported private key using AES-256-GCM.
- Backend stores the public key, encrypted private key, password hash, salts, and metadata.
- Backend returns a signed JWT access token.

### Login

- User submits email and password.
- Backend verifies the salted password hash.
- Backend returns a signed JWT access token.

### Protected API Access

- Client sends `Authorization: Bearer <token>`.
- Backend verifies the JWT signature and registered claims.
- Protected route handlers receive the decoded authentication payload.

### Planned Secure Messaging

- Each chat pair derives a shared secret with ECDH.
- The shared secret is processed with HKDF.
- AES-256 is used for message encryption and decryption.
- The server forwards encrypted payloads without holding plaintext message keys.

---

## Security Notes

- Do not commit `.env`.
- Do not commit real JWT private keys.
- Generate fresh keys for every deployment.
- Keep `BACKEND_HOST_BIND=127.0.0.1` for public deployments.
- Keep `POSTGRES_HOST_BIND=127.0.0.1` for public deployments.
- Use HTTPS in front of the reverse proxy when deployed to the internet.

---

## Contact

Nayaka Ghana Subrata <13523090@std.stei.itb.ac.id>

---

<br/>
<br/>

<div align="center">
II4021 Kriptografi • 2026 • Convo
</div>
