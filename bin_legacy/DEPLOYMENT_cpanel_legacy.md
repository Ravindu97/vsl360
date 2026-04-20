# VSL360 Deployment Runbook (cPanel — archived)

> **Archived:** This document describes the **former** cPanel shared-hosting deployment.  
> **Current production** uses VPS + Docker — see [DEPLOYMENT_RUNBOOK.md](../DEPLOYMENT_RUNBOOK.md) in the repo root.

## Production topology

- Frontend: `https://admin.visitsrilanka360.com`
- Backend API: `https://api.admin.visitsrilanka360.com`
- Backend health check: `https://api.admin.visitsrilanka360.com/api/health`
- Hosting: cPanel shared hosting (ServerSalad / CloudLinux) with Node.js App enabled
- Backend app root on server: `/home/adminvisitsrilan/vsl360-backend`
- Backend repository clone on server: `/home/adminvisitsrilan/repositories/vsl360`
- Frontend document root on server: `/home/adminvisitsrilan/public_html`
- Upload storage on server: `/home/adminvisitsrilan/vsl360-backend/uploads`
- Database: PostgreSQL via Unix socket at `/tmp/.s.PGSQL.5432`

## Important production settings

Frontend production env:

```env
VITE_API_URL=https://api.admin.visitsrilanka360.com/api
```

Backend production env (`/home/adminvisitsrilan/.config/vsl360/backend.env`):

```env
NODE_ENV=production
DATABASE_URL=postgresql://<db_user>:<url_encoded_password>@%2Ftmp/adminvisitsrilan_vsl360
SHADOW_DATABASE_URL=postgresql://<db_user>:<url_encoded_password>@%2Ftmp/adminvisitsrilan_vsl360_shadow
JWT_SECRET=<long_random_secret>
JWT_REFRESH_SECRET=<long_random_secret>
CORS_ORIGIN=https://admin.visitsrilanka360.com
UPLOAD_DIR=/home/adminvisitsrilan/vsl360-backend/uploads
PDF_RENDERER_TYPE=pdfkit
PDF_MAX_CONCURRENT_JOBS=2
PDF_CLEANUP_DAYS=90
```

> **Note:** PostgreSQL on this cPanel server only accepts Unix socket connections. The `@%2Ftmp` in the URL is the URL-encoded form of `@/tmp` which tells the driver to use the socket file at `/tmp/.s.PGSQL.5432`. Do NOT use `@localhost:5432` — TCP connections are not available.

## Server constraints

This cPanel shared hosting has several constraints that the deploy scripts work around:

- **npm binary is broken**: The native `/opt/alt/alt-nodejs20/root/usr/bin/npm` crashes with `Aborted (core dumped)`. Scripts use `node /opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js` directly.
- **Process/resource limits**: CloudLinux enforces tight process limits. `@prisma/engines` postinstall crashes with SIGABRT. Scripts use `--ignore-scripts` on npm install and run `prisma generate` separately.
- **NODE_ENV=production skips devDependencies**: The env file sets `NODE_ENV=production`, so the deploy script temporarily overrides to `NODE_ENV=development` during install/build, then restores it.
- **No TCP for PostgreSQL**: Only Unix socket connections work (see above).

## Deployment model

CI/CD is handled by GitHub Actions via SSH. The deploy scripts live in the repository.

- Source of truth: `/home/adminvisitsrilan/repositories/vsl360`
- Backend deploy script: `scripts/deploy-backend.sh` (archived under `bin_legacy/scripts/cpanel/`)
- Frontend deploy script: `scripts/deploy-frontend.sh` (archived under `bin_legacy/scripts/cpanel/`)
- Runtime backend app root: `/home/adminvisitsrilan/vsl360-backend`
- Runtime frontend root: `/home/adminvisitsrilan/public_html`

## What the CI/CD deploy does and does NOT do

### Backend deploy steps (automated):
1. Git pull latest code
2. Stop app (touch restart.txt)
3. Sync files from repo to app root (preserving uploads)
4. Load env file
5. npm install (with `--ignore-scripts`)
6. Install build tools (typescript, prisma, @types/*)
7. Prisma generate (downloads query engine)
8. TypeScript build (`tsc`)
9. Rebuild native modules (bcrypt)
10. Restart app

### NOT automated (run manually via SSH):
- `prisma migrate deploy` — run when schema/migrations change
- `prisma db seed` / `npm run db:seed` — run when seed data needs updating

## Server-side deploy scripts

### Backend script

```bash
#!/usr/bin/env bash
set -e

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE="/home/adminvisitsrilan/.config/vsl360/backend.env"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# Native npm binary is broken; invoke npm-cli.js via node
NPM_CLI="/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js"
if [ ! -f "$NPM_CLI" ]; then
  NPM_CLI="$(find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -1)"
fi
if [ ! -f "$NPM_CLI" ]; then echo "FATAL: npm-cli.js not found"; exit 1; fi

npm_run() { node "$NPM_CLI" "$@"; }

# Setup → Git Pull → Stop → Sync → Load Env → Install → Build Tools →
# Prisma Generate → Build → Rebuild Native → Restart
```

### Frontend script

```bash
#!/usr/bin/env bash
set -e

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# Same npm-cli.js wrapper as backend
# Git Pull → npm ci (or npm install fallback) → Build → Deploy to public_html
# Preserves .well-known and .htaccess
```

## GitHub Actions automation

### Workflow file

```
.github/workflows/deploy.yml
```

Trigger: `workflow_dispatch` (manual only).

### Inputs

| Input | Options | Default |
|-------|---------|---------|
| `target` | `backend`, `frontend`, `both` | `both` |
| `branch` | any branch name | `make-ready-for-depployment` |
| `run_seed` | `true`, `false` | `false` |

> Note: `run_seed` is no longer used since migrations/seeds are manual. It remains as a workflow input but is a no-op.

### Required GitHub repository secrets

| Secret | Value |
|--------|-------|
| `CPANEL_HOST` | `91.204.209.39` |
| `CPANEL_USER` | `adminvisitsrilan` |
| `CPANEL_SSH_KEY` | Private SSH key for the deployment user |
| `CPANEL_SSH_PASSPHRASE` | Passphrase for the SSH key |
| `CPANEL_SSH_PORT` | `22` |

### How to deploy

1. Push code to `make-ready-for-depployment`
2. Go to GitHub Actions → "Deploy Production"
3. Click "Run workflow"
4. Choose target (`backend`, `frontend`, or `both`)
5. Verify health check and UI after completion

## Database changes (manual via SSH)

Database migrations and seeds are run manually, not via CI/CD.

### Applying migrations

```bash
ssh -p 22 adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/vsl360-backend
export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"
export DATABASE_URL="postgresql://adminvisitsrilan_admin:<url_encoded_password>@%2Ftmp/adminvisitsrilan_vsl360"
npx prisma migrate deploy
```

### Running seed

```bash
ssh -p 22 adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/vsl360-backend
export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"
export DATABASE_URL="postgresql://adminvisitsrilan_admin:<url_encoded_password>@%2Ftmp/adminvisitsrilan_vsl360"
npx tsx prisma/seed.ts
```

### Creating migrations locally

```bash
cd /Users/ravindufernando/Documents/VSL360/backend
npm run db:migrate
git add prisma
git commit -m "Add migration for <change>"
git push origin make-ready-for-depployment
```

Then SSH to server and run `prisma migrate deploy` as above.

Do NOT use `prisma migrate dev` in production.
Do NOT use `prisma db push` in production.

## Backend release process

1. Commit and push backend changes to `make-ready-for-depployment`
2. Run GitHub Actions workflow with target `backend`
3. If you changed Prisma schema, SSH in and run `prisma migrate deploy` manually
4. Verify: `curl -i https://api.admin.visitsrilanka360.com/api/health`

## Frontend release process

1. Ensure `frontend/.env.production` has `VITE_API_URL=https://api.admin.visitsrilanka360.com/api`
2. Commit and push frontend changes to `make-ready-for-depployment`
3. Run GitHub Actions workflow with target `frontend`
4. Verify: open `https://admin.visitsrilanka360.com`, confirm login works

## Verification checklist

### Backend

```bash
curl -i https://api.admin.visitsrilanka360.com/api/health
```

Expected: HTTP 200 with JSON `status: ok`

### Frontend

- Login page loads at `https://admin.visitsrilanka360.com`
- No console calls to `localhost:3000`
- Login with `admin@vsl360.com` / `admin123` works
- Dashboard, bookings list, document generation work

## Rollback

### Backend

```bash
ssh -p 22 adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/repositories/vsl360
git log --oneline -n 10
git checkout <previous_commit>
scripts/deploy-backend.sh <previous_commit>
```

### Frontend

```bash
ssh -p 22 adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/repositories/vsl360
git log --oneline -n 10
git checkout <previous_commit>
scripts/deploy-frontend.sh <previous_commit>
```

> Database rollback is NOT automatic. Avoid destructive schema changes without backup.

## First-time setup checklist

### Backend

- Create Node.js app in cPanel: version `20.20.0`, mode `production`
- App root: `/home/adminvisitsrilan/vsl360-backend`
- App URI: `api.admin.visitsrilanka360.com/`
- Startup file: `dist/index.js`

### Database

- Create databases: `adminvisitsrilan_vsl360` and `adminvisitsrilan_vsl360_shadow`
- Create DB user and grant all privileges
- Connection is via Unix socket only (`@%2Ftmp/`)

### DNS (managed in Spaceship)

- Type: `A`, Host: `api.admin`, Value: `91.204.209.39`

### SSL

- Attach `api.admin.visitsrilanka360.com` to cPanel
- Run AutoSSL

### Env file

Create `/home/adminvisitsrilan/.config/vsl360/backend.env` with the production values listed above.

## Operational notes

- Root API URL returning `Cannot GET /` is normal — routes are under `/api`
- Keep `.htaccess` and `.well-known` in `public_html`
- Keep backend env outside app root (deploy script does destructive sync)
- Do not commit production secrets to Git
- Native npm binary is broken — always use `node npm-cli.js` wrapper
- `--ignore-scripts` is required on npm install to avoid SIGABRT from @prisma/engines
- PDF generation uses `pdfkit` (Node-only); no Chrome/Puppeteer installation is required

## Frontend SPA rewrite rule

Keep in `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]

  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

## Quick reference

| Action | Command |
|--------|---------|
| Deploy backend | GitHub Actions → Deploy Production → backend |
| Deploy frontend | GitHub Actions → Deploy Production → frontend |
| Run migration | SSH → `cd vsl360-backend && DATABASE_URL=... npx prisma migrate deploy` |
| Health check | `curl -i https://api.admin.visitsrilanka360.com/api/health` |
| Frontend URL | `https://admin.visitsrilanka360.com` |
| Backend URL | `https://api.admin.visitsrilanka360.com/api` |
