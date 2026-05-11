# Convo

> Tugas 3 II4021 Kriptografi 2026

<h3 align="center">End-to-end encrypted web chat with JWT authentication, ECDH key exchange, and AES-based private messaging</h3>

## Overview

`Convo` is a web-based secure messaging application. The project combines user authentication, client-side cryptographic key preparation, encrypted private-key storage, and a production-oriented container setup behind a reverse proxy.

The current implementation includes the landing page, sign-up flow, sign-in flow, custom JWT authentication, encrypted ECDH private-key storage, PostgreSQL persistence, Docker orchestration, and JWT unit tests. Contact selection, chat key derivation, encrypted messaging, MAC verification, and WebSocket delivery are planned next.

## Tech Stack and Languages

<p align="center">
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/TypeScript/TypeScript.png" alt="TypeScript" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/React/React.png" alt="React" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/Hono/Hono.png" alt="Hono" width="160"/>
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
    <tr align="center">
      <td>18223113</td>
      <td>Aldoy Fauzan Avanza</td>
      <td>
        <a href="https://github.com/aldoyfa">
          <img src="https://github.com/aldoyfa.png" width="48" alt="aldoyfa" /><br/>
          <sub><b>@aldoyfa</b></sub>
        </a>
      </td>
    </tr>
    <tr align="center">
      <td>18223082</td>
      <td>Mahesa Satria Prayata</td>
      <td>
        <a href="https://github.com/echaa0018">
          <img src="https://github.com/echaa0018.png" width="48" alt="echaa0018" /><br/>
          <sub><b>@echaa0018</b></sub>
        </a>
      </td>
    </tr>
  </table>
</div>

## About Convo

`Convo` is designed around a server-assisted but privacy-oriented messaging model. The server authenticates users and stores encrypted key material, while cryptographic operations for communication are designed to happen on the client side. During registration, the frontend generates an ECDH key pair with the Web Crypto API. The private key is encrypted before being sent to the backend, and the backend stores only the encrypted private key, public key, and recovery metadata.

Authentication uses a custom JWT library implemented in the backend. Tokens are encoded as JWS compact serialization and signed with ECDSA. The JWT library supports ES256, ES384, and ES512 for assignment compliance, while application login tokens use ES256 only. The client sends JWTs as `Authorization: Bearer <token>`. Cookie storage is allowed by the assignment, but not required.

Password verification uses scrypt with a unique per-user salt. Private ECDH key protection uses PBKDF2-SHA-256 in the browser to derive an AES-256-GCM wrapping key from the user's password. Planned chat encryption uses ECDH P-256, HKDF-SHA-256 for chat key separation, AES-256-GCM for message encryption, and HMAC-SHA-256 for the MAC bonus.

---

## Features

- Landing page
- Sign-up page
- Sign-in page
- Salted scrypt password hashing
- Custom JWT sign and verify library
- ES256, ES384, and ES512 support
- JWT unit tests with Node.js `node:test`
- Client-side ECDH key generation
- Client-side private-key encryption before upload with PBKDF2-SHA-256 and AES-256-GCM
- PostgreSQL persistence through Prisma
- Docker Compose full-stack setup
- Caddy reverse proxy with HTTPS
- Production-oriented port isolation
- Husky pre-commit and pre-push quality gates

---

## Project Structure

```text
Convo/
  backend/          Hono API, Prisma, PostgreSQL, JWT library
  frontend/         React, Vite, TypeScript web client
  reverse-proxy/    Caddy public HTTPS entrypoint
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

- Public application: `https://localhost`
- Backend: internal Docker network only
- PostgreSQL: internal Docker network only

Public routing:

- `/` -> frontend static server
- `/api/*` -> backend API

The backend and database are not published to the host by default. The reverse proxy is the only public entrypoint.

The Docker reverse proxy uses Caddy. For local development, Caddy serves `https://localhost` with its internal development CA. Browsers may warn until the Caddy local root CA is trusted.

### Production VPS HTTPS

For a real VPS with a trusted certificate, keep the same `docker-compose.yml` and change only `.env`. Caddy automatically obtains and renews certificates from Let's Encrypt when `PUBLIC_DOMAIN` is a public domain and `TLS_DIRECTIVE` is empty.

Prerequisites:

- A domain name with DNS `A` or `AAAA` records pointing to the VPS public IP.
- Public inbound ports `80` and `443` open in the VPS firewall/security group.
- Docker and Docker Compose installed on the VPS.

Create the production environment file:

```bash
cp .env.example .env
```

Set at least:

```env
PUBLIC_DOMAIN=chat.example.com
PUBLIC_ORIGIN=https://chat.example.com
FRONTEND_ORIGIN=https://chat.example.com
TLS_DIRECTIVE=
POSTGRES_PASSWORD=replace-with-long-random-production-password
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
```

Run the production stack:

```bash
docker compose up --build -d
```

Caddy stores ACME certificates in the `convo_caddy_data` Docker volume, so certificates survive container recreation and renew automatically.

### Local Development

Copy .env.example into .env

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

> [!NOTE]
> Local development uses the same `docker-compose.yml` as the full stack. PostgreSQL is published to `127.0.0.1:5532`, so the backend can run outside Docker with `DATABASE_URL=postgres://...@localhost:5532/...`.

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

Run the JWT unit tests directly:

```bash
cd backend
bun run test:jwt
```

---

## Supported Workflows

### Authentication

- User registers with email and password.
- Frontend generates an ECDH key pair.
- Frontend derives a wrapping key with PBKDF2-SHA-256.
- Frontend encrypts the exported private key using AES-256-GCM.
- Backend stores the public key, encrypted private key, password hash, salts, and metadata.
- Backend issues a signed JWT access token in an `HttpOnly` cookie.
- Backend hashes the password with scrypt and returns a signed ES256 JWT access token.

### Login

- User submits email and password.
- Backend verifies the salted scrypt password hash.
- Backend issues a signed JWT access token in an `HttpOnly` cookie.

### Protected API Access

- Browser sends the `HttpOnly` auth cookie with API requests.
- Backend verifies the JWT signature and registered claims.
- Backend accepts ES256 application tokens only.
- Protected route handlers receive the decoded authentication payload.

### Planned Secure Messaging

- Each chat pair derives a shared secret with ECDH.
- The shared secret is processed with HKDF.
- HKDF separates the shared secret into an AES-256-GCM message key and an HMAC-SHA-256 MAC key.
- AES-256-GCM is used for message encryption and decryption.
- HMAC-SHA-256 is verified before decryption for the MAC bonus.
- The server forwards encrypted payloads without holding plaintext message keys.

---

## Security Notes

- Do not commit `.env`.
- Do not commit real JWT private keys.
- Store JWTs in `HttpOnly` cookies instead of browser-readable storage.
- Generate fresh keys for every deployment.
- Keep backend and PostgreSQL on the internal Docker network for public deployments.
- Use HTTPS in front of the reverse proxy when deployed to the internet.

---

## Contact

Nayaka Ghana Subrata <13523090@std.stei.itb.ac.id>

Aldoy Fauzan Avanza <18223113@std.stei.itb.ac.id>

Mahesa Satria Prayata <18223082@std.stei.itb.ac.id>

---

<br/>
<br/>

<div align="center">
II4021 Kriptografi • 2026 • Convo
</div>
