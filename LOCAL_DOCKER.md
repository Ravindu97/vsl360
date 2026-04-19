# Running VSL360 locally with Docker

This guide describes how to run the full stack (PostgreSQL, backend API, frontend) on your machine using Docker Compose, **without** reusing production secrets in `.env.production`.

Production deployments should continue to use `.env.production` on the VPS. Local development uses **`.env.local`** (gitignored).

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2) with **BuildKit** enabled (default on recent Docker Desktop).
- **Git** and this repository checked out at the project root (`VSL360/`).

Optional:

- `openssl` for generating secrets (macOS/Linux usually have it).

---

## How local env files work

| File | Purpose |
|------|---------|
| **`.env.local`** | Your real local secrets and URLs. **Never commit.** |
| **`.env.local.example`** | Safe template; copy to `.env.local` and edit. |
| **`.env.production`** | Used only on the VPS / production-style deploys. |

Compose is configured so **one file** drives both **variable substitution** and **container `env_file`**:

1. Put `COMPOSE_ENV_FILE=.env.local` inside `.env.local` (already in the example).
2. Always pass that file to Compose:  
   `docker compose --env-file .env.local ...`

That avoids the issue where `env_file: .env.production` in YAML does not, by itself, satisfy `${POSTGRES_PASSWORD}` interpolation (Compose reads the file you pass with `--env-file`).

---

## First-time setup

From the **repository root** (where `docker-compose.yml` lives):

### 1. Create `.env.local`

```bash
cp .env.local.example .env.local
```

### 2. Edit `.env.local`

Set strong values at minimum:

- `POSTGRES_PASSWORD`
- `JWT_SECRET` and `JWT_REFRESH_SECRET` (long random strings)

Keep these for local Docker:

- `COMPOSE_ENV_FILE=.env.local`
- `VITE_API_URL=http://localhost:3000/api` — frontend build talks to the **local** API (required for CORS from `http://localhost:8080`).
- `CORS_ORIGINS` includes `http://localhost:8080` (and `http://localhost:5173` if you use Vite dev server later).

Generate example secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

---

## Start the stack

### Build and run all services

```bash
docker compose --env-file .env.local up -d --build
```

### Check status

```bash
docker compose --env-file .env.local ps
```

Expected: `db` **healthy**, `backend` and `frontend` **Up**.

### Verify API

```bash
curl -i http://localhost:3000/api/health
```

Expect `HTTP/1.1 200` and JSON `{"status":"ok",...}`.

### Open the UI

- **Frontend:** http://localhost:8080  
- **API (host):** http://localhost:3000/api  

---

## Database: first run

If this is a **new** local database (empty volume):

### Apply migrations

```bash
docker compose --env-file .env.local exec backend npx prisma migrate deploy
```

### Optional: seed demo data

Only if you want the seed script’s data (see `backend/prisma/seed.ts`):

```bash
docker compose --env-file .env.local exec backend npx tsx prisma/seed.ts
```

If you **restore a dump** instead, follow the same pattern as production (pipe SQL into `psql` inside the `db` service); you usually **do not** run seed after a restore.

---

## Rebuild after changing API URL or frontend env

`VITE_API_URL` is **baked into the frontend image at build time**. If you change it in `.env.local`, rebuild the frontend:

```bash
docker compose --env-file .env.local build --no-cache frontend
docker compose --env-file .env.local up -d frontend
```

Rebuild the backend after `Dockerfile` or dependency changes:

```bash
docker compose --env-file .env.local build backend
docker compose --env-file .env.local up -d backend
```

---

## Useful commands

| Action | Command |
|--------|---------|
| Logs (all) | `docker compose --env-file .env.local logs -f` |
| Logs (backend) | `docker compose --env-file .env.local logs -f backend` |
| Stop stack | `docker compose --env-file .env.local down` |
| Stop and remove DB volume (**wipes DB**) | `docker compose --env-file .env.local down -v` |
| Plain build output | `DOCKER_BUILDKIT=1 docker compose --env-file .env.local build --progress=plain backend` |

---

## Troubleshooting

### `POSTGRES_PASSWORD` / interpolation errors

Always use:

```bash
docker compose --env-file .env.local ...
```

and ensure `.env.local` contains `COMPOSE_ENV_FILE=.env.local`.

### CORS errors in the browser (frontend → production API)

The UI must call the **local** API when testing at `http://localhost:8080`:

- Set `VITE_API_URL=http://localhost:3000/api` in `.env.local`.
- Rebuild the **frontend** image (see above).

### `ERR_CONNECTION_REFUSED` to `http://localhost:3000`

Usually the backend container is not listening (crashed or restarting):

```bash
docker compose --env-file .env.local ps
docker compose --env-file .env.local logs --tail 100 backend
```

### Prisma “Query Engine” / OpenSSL mismatch on Apple Silicon

The repo’s `schema.prisma` includes `binaryTargets` suitable for Debian-based Node images on **ARM64** and **amd64**. If you still see engine errors after changing Prisma version, run a clean backend build:

```bash
docker compose --env-file .env.local build --no-cache backend
docker compose --env-file .env.local up -d backend
```

### Docker image build is slow the first time

The first `docker compose build` downloads base images, runs `npm ci`, `prisma generate` (multiple engines), installs Chromium in the final stage, and compiles TypeScript. **Later builds** are faster thanks to layer and BuildKit caches. Avoid `--no-cache` unless you need a full rebuild.

### Cannot pull images (`registry-1.docker.io` timeout)

That is a **network** issue between your machine and Docker Hub (VPN, firewall, ISP). Try another network (e.g. mobile hotspot) or fix proxy settings in Docker Desktop.

---

## Production vs local (quick reference)

| | Local Docker | Production (VPS) |
|--|--------------|------------------|
| Env file | `.env.local` | `.env.production` |
| Compose | `docker compose --env-file .env.local ...` | `docker compose --env-file .env.production ...` |
| Frontend API URL | `http://localhost:3000/api` | `https://api.admin.visitsrilanka360.com/api` |
| CORS | `http://localhost:8080`, etc. | Production admin domains |

---

## Optional: shell alias

To avoid typing `--env-file .env.local` every time:

```bash
alias dc-local='docker compose --env-file .env.local'
```

Then:

```bash
dc-local up -d
dc-local ps
dc-local logs -f backend
```

---

## Related docs

- **[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)** — VPS, Nginx, SSL, CI/CD.
