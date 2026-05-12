# Convo

> Secure web chat with end-to-end encrypted messaging

<h3 align="center">End-to-end encrypted web chat with JWT authentication, ECDH key exchange, and AES-based private messaging</h3>
<img width="2559" height="1248" alt="image" src="https://github.com/user-attachments/assets/84d9b8c8-7b81-47d6-9aee-2123ce63ff98" />

## Overview

`Convo` is a secure web-based messaging application focused on private one-to-one communication, user authentication, and a full-stack deployment setup that can run locally or in Docker.

It consists of a landing page, sign-up and sign-in flow, contact list, one-to-one chat, encrypted message history, real-time message delivery, and the supporting backend and database services behind them.

## Tech Stack and Languages

<p align="center">
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/TypeScript/TypeScript.png" alt="TypeScript" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/React/React.png" alt="React" width="160"/>
  <img src="https://raw.githubusercontent.com/Ender-Wiggin2019/ServiceLogos/main/Hono/Hono.png" alt="Hono" width="160"/>
</p>

<p align="center">
  <a href="./frontend">Frontend</a>
  •
  <a href="./backend">Backend</a>
  •
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

`Convo` is designed as a privacy-oriented chat platform where users can communicate directly through a simple web interface. The system handles account registration, authentication, contact discovery, conversation management, and real-time chat in a single integrated application.

The project is built with a split frontend-backend architecture. The frontend provides the user experience for authentication and chatting, while the backend manages data storage, API access, and WebSocket communication. The overall goal is to provide a secure and practical messaging application that matches the assignment requirements while remaining deployable with a modern container-based setup.

---

## Features

- Landing page
- Sign-up page
- Sign-in page
- Contact list and one-to-one chat page
- Salted scrypt password hashing
- Custom JWT sign and verify library
- ES256, ES384, and ES512 support
- `HttpOnly` JWT access cookie with `hono/cookie`
- JWT unit tests with Node.js `node:test`
- Client-side ECDH key generation
- Client-side private-key encryption before upload with PBKDF2-SHA-256 and AES-256-GCM
- Client-side chat key derivation with ECDH and HKDF-SHA-256
- Encrypted message history decryption in the browser
- HMAC-SHA-256 verification before message decryption
- Unlock flow for reloading the encrypted private key after refresh
- Contact list and one-to-one conversation REST APIs
- Encrypted message history API
- Backend WebSocket endpoint for encrypted message persistence and broadcast
- PostgreSQL persistence through Prisma
- Docker Compose full-stack setup
- Caddy reverse proxy with HTTPS and static frontend serving
- Production-oriented port isolation
- Husky pre-commit and pre-push quality gates

---

## Project Structure

```text
Convo/
  backend/          Bun + Hono API, Prisma, PostgreSQL, JWT library
  frontend/         React, Vite, TypeScript web client
  reverse-proxy/    Caddy public HTTPS entrypoint and frontend static serving
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

### Dependencies

- PostgreSQL
- Caddy
- Prisma Client
- React Router
- Zod

> [!IMPORTANT]
> Copy `.env.example` to `.env` before running the application. Do not commit `.env` or real deployment secrets.

### Environment

Create the root environment file:

```bash
cp .env.example .env
```

Before deploying publicly, update at least:

- `NODE_ENV`
- `PUBLIC_ORIGIN`
- `FRONTEND_ORIGIN`
- `POSTGRES_PASSWORD`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`

The repository uses a single root `.env` file as the source of truth for Docker and local development.

`FRONTEND_ORIGIN` may be a comma-separated allowlist. During local backend development, `http://localhost:4021` and `http://127.0.0.1:4021` are accepted automatically so the Vite frontend can sign up and sign in without hitting the origin guard.

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
- Backend: internal Docker network, with `127.0.0.1:9173` published for host-side debugging
- PostgreSQL: internal Docker network, with `127.0.0.1:5532` published for local development

Public routing:

- `/` -> frontend static files served directly by Caddy
- `/api/*` -> Bun backend API

The reverse proxy is the public entrypoint. The backend and database stay on the internal Docker network for the normal deployment path.

The Docker reverse proxy uses Caddy for both HTTPS termination and static frontend delivery. For local development, Caddy serves `https://localhost` with its internal development CA. Browsers may warn until the Caddy local root CA is trusted.

### Production VPS HTTPS

For a real VPS with a trusted certificate, keep the same `docker-compose.yml` and change only `.env`. Caddy automatically obtains and renews certificates from Let's Encrypt when `PUBLIC_DOMAIN` is a public domain and `TLS_DIRECTIVE` is empty.

Prerequisites:

- A domain name with DNS `A` or `AAAA` records pointing to the VPS public IP
- Public inbound ports `80` and `443` open in the VPS firewall or security group
- Docker and Docker Compose installed on the VPS

Create the production environment file:

```bash
cp .env.example .env
```

Set at least:

```env
NODE_ENV=production
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

Copy `.env.example` into `.env`.

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run the backend:

```bash
cd backend
bun install
bun run db:generate
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

- User registers with email and password
- Frontend generates an ECDH key pair
- Frontend derives a wrapping key with PBKDF2-SHA-256
- Frontend encrypts the exported private key using AES-256-GCM
- Backend stores the public key, encrypted private key, password hash, salts, and metadata
- Backend issues a signed JWT access token in an `HttpOnly` cookie
- Backend hashes the password with scrypt and returns sanitized user data; the JWT itself stays in the cookie rather than the JSON body

### Login

- User submits email and password
- Backend verifies the salted scrypt password hash
- Backend issues a signed JWT access token in an `HttpOnly` cookie
- Backend returns sanitized user data and encrypted private-key metadata for local private-key decryption

### Protected API Access

- Browser sends the `HttpOnly` auth cookie with API requests
- Backend verifies the JWT signature and registered claims
- Backend accepts ES256 application tokens only
- Protected route handlers receive the decoded authentication payload
- Non-browser tools may use `Authorization: Bearer <token>` as a compatibility fallback

### Secure Messaging

- Frontend loads contacts and creates or reuses one-to-one conversations
- Each chat pair derives a shared secret with ECDH
- HKDF-SHA-256 separates the shared secret into an AES-256-GCM message key and an HMAC-SHA-256 MAC key
- AES-256-GCM is used for message encryption and decryption in the browser
- HMAC-SHA-256 is verified before decrypting history or live WebSocket messages
- The backend exposes contacts, conversation creation or lookup, encrypted message history APIs, and a WebSocket endpoint at `/api/ws`
- The server stores ciphertext, IV, MAC, algorithm, sender, receiver, conversation ID, and sent timestamp
- The server never decrypts messages and does not hold plaintext message keys, ECDH shared secrets, or derived chat keys

### Private-Key Unlock Flow

- The decrypted private key is kept only in browser memory
- User identity and encrypted private-key metadata are stored in `sessionStorage`
- After reload, the user may need to re-enter their password so the private key can be decrypted locally again

---

## Security Notes

- Do not commit `.env`
- Do not commit real JWT private keys
- Store browser JWTs only in the `__Host-convo_access_token` `HttpOnly` cookie instead of browser-readable storage
- Use credentialed frontend requests so the browser sends the auth cookie
- Generate fresh keys for every deployment
- Keep backend and PostgreSQL on the internal Docker network for public deployments
- Use HTTPS in front of the reverse proxy when deployed to the internet

---

## Contact

Nayaka Ghana Subrata <13523090@std.stei.itb.ac.id>

Aldoy Fauzan Avanza <18223113@std.stei.itb.ac.id>

Mahesa Satria Prayata <18223082@std.stei.itb.ac.id>

---

<br/>
<br/>

<div align="center">
Convo • 2026
</div>
