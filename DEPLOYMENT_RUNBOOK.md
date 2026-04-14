# VSL360 Deployment Runbook

## Production topology

Current production setup:

- Frontend: `https://admin.visitsrilanka360.com`
- Backend API: `https://api.admin.visitsrilanka360.com`
- Backend health check: `https://api.admin.visitsrilanka360.com/api/health`
- Hosting: cPanel shared hosting with Node.js App enabled
- Backend app root on server: `/home/adminvisitsrilan/vsl360-backend`
- Backend repository clone on server: `/home/adminvisitsrilan/repositories/vsl360`
- Frontend document root on server: `/home/adminvisitsrilan/public_html`
- Upload storage on server: `/home/adminvisitsrilan/vsl360-backend/uploads`
- Database: PostgreSQL on the same hosting account

## Important production settings

Frontend production env:

```env
VITE_API_URL=https://api.admin.visitsrilanka360.com/api
```

Backend production env:

```env
NODE_ENV=production
DATABASE_URL=postgresql://<db_user>:<url_encoded_password>@localhost:5432/adminvisitsrilan_vsl360
SHADOW_DATABASE_URL=postgresql://<db_user>:<url_encoded_password>@localhost:5432/adminvisitsrilan_vsl360_shadow
JWT_SECRET=<long_random_secret>
JWT_REFRESH_SECRET=<long_random_secret>
CORS_ORIGIN=https://admin.visitsrilanka360.com
CORS_ORIGINS=https://admin.visitsrilanka360.com,https://www.admin.visitsrilanka360.com
UPLOAD_DIR=/home/adminvisitsrilan/vsl360-backend/uploads
```

## Deployment model

Production deployment should use the repository clone on the server.

- Source of truth: `/home/adminvisitsrilan/repositories/vsl360`
- Backend deploy script in repo: `/home/adminvisitsrilan/repositories/vsl360/scripts/deploy-backend.sh`
- Frontend deploy script in repo: `/home/adminvisitsrilan/repositories/vsl360/scripts/deploy-frontend.sh`
- Runtime backend app root: `/home/adminvisitsrilan/vsl360-backend`
- Runtime frontend root: `/home/adminvisitsrilan/public_html`

This avoids shipping local `node_modules`, ensures Linux-native binaries are installed on the server, and keeps the deploy logic version-controlled.

## Server-side deploy scripts

Backend script path:

```bash
/home/adminvisitsrilan/repositories/vsl360/scripts/deploy-backend.sh
```

Recommended env file location outside app root:

```bash
/home/adminvisitsrilan/.config/vsl360/backend.env
```

Recommended backend deploy script:

```bash
#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"
RUN_SEED="${2:-no-seed}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE_PRIMARY="/home/adminvisitsrilan/.config/vsl360/backend.env"
ENV_FILE_FALLBACK="/home/adminvisitsrilan/vsl360-backend/.env.production"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

echo "==> Using Node: $(node -v)"
echo "==> Using npm:  $(npm -v)"

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "ERROR: Repo not found at $REPO_ROOT"
  exit 1
fi

cd "$REPO_ROOT"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

mkdir -p "$APP_ROOT/uploads/documents"
find "$APP_ROOT" -mindepth 1 -maxdepth 1 ! -name uploads -exec rm -rf {} +

(
  cd "$REPO_ROOT/backend"
  tar -cf - \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=.env.production \
    --exclude=uploads \
    .
) | (
  cd "$APP_ROOT"
  tar -xf -
)

ENV_FILE=""
if [[ -f "$ENV_FILE_PRIMARY" ]]; then
  ENV_FILE="$ENV_FILE_PRIMARY"
elif [[ -f "$ENV_FILE_FALLBACK" ]]; then
  ENV_FILE="$ENV_FILE_FALLBACK"
fi

if [[ -n "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "WARNING: No env file found. Prisma steps may fail if env vars are not exported."
fi

cd "$APP_ROOT"
rm -rf node_modules
npm install --omit=dev
npm install --include=dev --no-save \
  typescript \
  prisma \
  @types/node \
  @types/express \
  @types/cors \
  @types/cookie-parser \
  @types/bcrypt \
  @types/jsonwebtoken \
  @types/multer
npm run build
npx prisma generate

retry_migrate() {
  local max_attempts=5
  local attempt=1

  until npx prisma migrate deploy; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      echo "ERROR: Prisma migrate deploy failed after ${max_attempts} attempts"
      return 1
    fi

    local sleep_seconds=$((attempt * 10))
    echo "Prisma migrate deploy failed (attempt ${attempt}/${max_attempts}); retrying in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
}

retry_migrate

if [[ "$RUN_SEED" == "seed" ]]; then
  npm run db:seed
fi

mkdir -p "$APP_ROOT/uploads/documents"
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"
```

Make it executable:

```bash
chmod +x /home/adminvisitsrilan/repositories/vsl360/scripts/deploy-backend.sh
```

Frontend script path:

```bash
/home/adminvisitsrilan/repositories/vsl360/scripts/deploy-frontend.sh
```

Recommended frontend deploy script:

```bash
#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

cd "$REPO_ROOT"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

cd "$FRONTEND_ROOT"
npm install
npm run build

find "$PUBLIC_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

cp -R dist/. "$PUBLIC_ROOT/"
```

Make it executable:

```bash
chmod +x /home/adminvisitsrilan/repositories/vsl360/scripts/deploy-frontend.sh
```

## Backend release process

Use this when backend code changes.

### 1. Update code locally

Run locally:

```bash
cd /Users/ravindufernando/Documents/VSL360
```

Commit and push:

```bash
git status
git add backend
git commit -m "Describe backend change"
git push origin make-ready-for-depployment
```

### 2. Deploy on the server

SSH into the server:

```bash
ssh adminvisitsrilan@91.204.209.39
```

Run the deploy script:

```bash
cd /home/adminvisitsrilan/repositories/vsl360
scripts/deploy-backend.sh
```

If you intentionally need seed data reapplied:

```bash
cd /home/adminvisitsrilan/repositories/vsl360
scripts/deploy-backend.sh make-ready-for-depployment seed
```

### 3. Verify backend

```bash
curl -i https://api.admin.visitsrilanka360.com/api/health
```

Expected response:

- HTTP `200`
- JSON containing `status: ok`

## Frontend release process

Use this when frontend code changes.

### 1. Set production API URL

Create or update:

```bash
/Users/ravindufernando/Documents/VSL360/frontend/.env.production
```

Content:

```env
VITE_API_URL=https://api.admin.visitsrilanka360.com/api
```

### 2. Commit and push frontend changes

```bash
cd /Users/ravindufernando/Documents/VSL360
git status
git add frontend
git commit -m "Describe frontend change"
git push origin make-ready-for-depployment
```

### 3. Deploy on the server

```bash
ssh adminvisitsrilan@91.204.209.39
```

```bash
cd /home/adminvisitsrilan/repositories/vsl360
scripts/deploy-frontend.sh
```

### 4. Verify frontend bundle points to the production API

Run locally:

```bash
curl -s https://admin.visitsrilanka360.com/assets/$(curl -s https://admin.visitsrilanka360.com | grep -o 'assets/index-[^"]*\.js' | head -n 1) | grep -o 'https://api.admin.visitsrilanka360.com/api' | head
```

Expected output:

```bash
https://api.admin.visitsrilanka360.com/api
```

### 5. Clear browser cache if UI still uses old assets

- Open DevTools
- Right-click refresh button
- Click `Empty Cache and Hard Reload`

If needed, test in a private window.

## Database changes

Use this when Prisma schema or migrations change.

### Local workflow

Create migration locally:

```bash
cd /Users/ravindufernando/Documents/VSL360/backend
npm run db:migrate
```

Commit and push:

```bash
cd /Users/ravindufernando/Documents/VSL360
git add backend/prisma backend/src
git commit -m "Add migration for <change>"
git push origin make-ready-for-depployment
```

### Production apply

Production migrations are applied by the backend deploy script through:

```bash
npx prisma migrate deploy
```

Do not use `prisma migrate dev` in production.
Do not use `prisma db push` in production.

## First-time setup checklist

Use this only when provisioning a new environment.

### Backend

- Create Node.js app in cPanel
- Node version: `20.20.0`
- Mode: `production`
- App root: `/home/adminvisitsrilan/vsl360-backend`
- App URI: `api.admin.visitsrilanka360.com/`
- Startup file: `dist/index.js`

### Database

Create PostgreSQL databases:

- `adminvisitsrilan_vsl360`
- `adminvisitsrilan_vsl360_shadow`

Create DB user and grant all privileges to both databases.

### DNS

Authoritative DNS is managed in Spaceship, not cPanel.

Required record:

- Type: `A`
- Host: `api.admin`
- Value: `91.204.209.39`

### SSL

- Attach `api.admin.visitsrilanka360.com` to cPanel account
- Run AutoSSL
- Verify the certificate is publicly trusted

## Verification checklist after every deploy

### Backend checks

```bash
curl -i https://api.admin.visitsrilanka360.com/api/health
```

Expected:

- `HTTP/2 200`
- JSON health response

### Frontend checks

Open:

- `https://admin.visitsrilanka360.com`

Confirm:

- login page loads
- no browser console calls to `localhost:3000`
- login works
- dashboard loads
- bookings list loads

### Functional checks

Use seeded account if still active:

- `admin@vsl360.com`
- `admin123`

Confirm:

- login succeeds
- create booking works
- attachment upload works
- document generation works

## Rollback

### Backend rollback

Rollback to previous Git commit or previous stable branch:

```bash
ssh adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/repositories/vsl360
git log --oneline -n 10
git checkout <previous_commit_or_branch>
/home/adminvisitsrilan/deploy-vsl360-backend.sh
```

Recommended rollback flow if the repo clone is the source of truth:

```bash
ssh adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/repositories/vsl360
git log --oneline -n 10
git checkout <previous_commit_or_branch>
scripts/deploy-backend.sh <previous_commit_or_branch>
```

Note:

- Code rollback is easy
- Database rollback is not automatic
- Avoid destructive schema changes without backup planning

### Frontend rollback

```bash
ssh adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/repositories/vsl360
git log --oneline -n 10
git checkout <previous_commit_or_branch>
scripts/deploy-frontend.sh <previous_commit_or_branch>
```

## GitHub Actions automation

Repository workflow:

```bash
.github/workflows/deploy.yml
```

The workflow uses SSH to connect to the server, pull the chosen branch on the server-side clone, and then run the same deploy scripts stored in the repository.

### Required GitHub repository secrets

- `CPANEL_HOST`: `91.204.209.39`
- `CPANEL_USER`: `adminvisitsrilan`
- `CPANEL_SSH_KEY`: private SSH key for the deployment user
- `CPANEL_SSH_PASSPHRASE`: passphrase for that private key, if the key is encrypted
- `CPANEL_SSH_PORT`: `22`

### What the workflow can deploy

- `backend`
- `frontend`
- `both`

### Manual trigger inputs

- `target`: `backend`, `frontend`, or `both`
- `branch`: branch to deploy, default `make-ready-for-depployment`
- `run_seed`: `true` or `false`

### Recommended workflow usage

1. Push code to `make-ready-for-depployment`.
2. Open GitHub Actions.
3. Run `Deploy Production`.
4. Choose `frontend`, `backend`, or `both`.
5. Verify the health check and UI after completion.

### Should deployment be fully automated on push?

Yes, but with one constraint: for production on cPanel shared hosting, manual `workflow_dispatch` is the safer default.

- Use `workflow_dispatch` for production releases.
- Add `push` trigger later only if you are comfortable auto-deploying every commit to the deployment branch.
- Keep database seed behind an explicit manual input.

## Operational notes

- Root API URL returning `Cannot GET /` is normal because the backend serves routes under `/api`
- Keep `.htaccess` in `public_html`
- Keep `.well-known` in `public_html`
- Keep backend env outside app root if using destructive sync/deploy scripts
- Prefer server-side Git deploys over local build artifact uploads
- Do not commit real production secrets to Git
- Rotate seeded passwords and secrets after initial launch

## Frontend SPA rewrite rule

Keep this in `public_html/.htaccess`:

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

### Backend deploy

```bash
ssh adminvisitsrilan@91.204.209.39 'cd /home/adminvisitsrilan/repositories/vsl360 && scripts/deploy-backend.sh'
```

### Frontend deploy

```bash
ssh adminvisitsrilan@91.204.209.39 'cd /home/adminvisitsrilan/repositories/vsl360 && scripts/deploy-frontend.sh'
```

### Backend health

```bash
curl -i https://api.admin.visitsrilanka360.com/api/health
```

### Production frontend URL

```text
https://admin.visitsrilanka360.com
```

### Production backend URL

```text
https://api.admin.visitsrilanka360.com/api
```
