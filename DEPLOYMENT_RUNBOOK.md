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
UPLOAD_DIR=/home/adminvisitsrilan/vsl360-backend/uploads
```

## Template Assets Build Fix

**Issue:** Backend build was not copying `.hbs` template files to `dist/` folder, causing runtime errors:
```
ENOENT: no such file or directory, open '.../dist/templates/invoice.hbs'
```

**Solution:** Updated `backend/package.json` build script to automatically copy template files after TypeScript compilation:

```json
{
  "scripts": {
    "build": "tsc && node scripts/copy-assets.js"
  }
}
```

The `scripts/copy-assets.js` file handles cross-platform copying of all files in `src/templates/` to `dist/templates/`.

**Local verification:**
```bash
cd backend
npm run build
ls -la dist/templates/  # Should show: invoice.hbs, itinerary.hbs, etc.
```

## GitHub Actions Automated Deployment

Automated deployment workflow is configured in `.github/workflows/deploy.yml`.

### Quick Setup

1. **Create SSH key pair** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/cpanel_deploy_key -N ""
   cat ~/.ssh/cpanel_deploy_key
   ```

2. **Add SSH public key to cPanel server**:
   ```bash
   ssh adminvisitsrilan@91.204.209.39
   mkdir -p ~/.ssh
   cat >> ~/.ssh/authorized_keys << 'EOF'
   [paste content from ~/.ssh/cpanel_deploy_key.pub]
   EOF
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Configure GitHub repository secrets** (Settings → Secrets and variables → Actions):
   - `CPANEL_HOST`: `91.204.209.39`
   - `CPANEL_USER`: `adminvisitsrilan`
   - `CPANEL_SSH_KEY`: [entire content of `~/.ssh/cpanel_deploy_key`]
   - `CPANEL_SSH_PASSPHRASE`: (leave empty if no passphrase)

### Automatic Deployments

- **Push to `main` branch** → Auto-deploys frontend + backend to production
- **Manual trigger** → Go to Actions tab → "Deploy VSL360" → Run workflow (select environment)

### Deployment Steps (Automated)

The workflow automatically:
1. Builds frontend (TypeScript + Vite)
2. Builds backend (TypeScript + copy templates + Prisma generate)
3. Creates `tar.gz` artifacts
4. Uploads artifacts to cPanel via SCP
5. Extracts and builds on server
6. Runs Prisma migrations
7. Restarts backend service
8. Verifies health endpoints

### Manual Deployment Fallback

If GitHub Actions is unavailable, use the manual script approach:

```bash
ssh adminvisitsrilan@91.204.209.39
/home/adminvisitsrilan/deploy-vsl360-backend.sh
```

### Rollback via GitHub

If deployment fails:
1. Go to **Actions** → review failed workflow
2. Revert commit: `git revert <commit_id> && git push origin main`
3. Workflow will auto-deploy the reverted code

**Manual rollback** (if needed):
```bash
ssh adminvisitsrilan@91.204.209.39
cd /home/adminvisitsrilan/vsl360-backend
cp -r dist.bak dist 2>/dev/null && npm ci && sudo systemctl restart vsl360
```

For full setup details, see [`.github/DEPLOYMENT_SECRETS.md`](.github/DEPLOYMENT_SECRETS.md)

## Server-side backend deploy script

Recommended location:

```bash
/home/adminvisitsrilan/deploy-vsl360-backend.sh
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
ENV_FILE="/home/adminvisitsrilan/.config/vsl360/backend.env"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

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

set -a
source "$ENV_FILE"
set +a

cd "$APP_ROOT"
npm install
npm run build
npx prisma generate
npx prisma migrate deploy

if [[ "$RUN_SEED" == "seed" ]]; then
  npm run db:seed
fi

mkdir -p "$APP_ROOT/uploads/documents"
touch "$APP_ROOT/tmp/restart.txt"
```

Make it executable:

```bash
chmod +x /home/adminvisitsrilan/deploy-vsl360-backend.sh
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
/home/adminvisitsrilan/deploy-vsl360-backend.sh
```

If you intentionally need seed data reapplied:

```bash
/home/adminvisitsrilan/deploy-vsl360-backend.sh make-ready-for-depployment seed
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

### 2. Build locally

```bash
cd /Users/ravindufernando/Documents/VSL360/frontend
npm run build
```

### 3. Package the built frontend

```bash
COPYFILE_DISABLE=1 tar --no-xattrs -czf /Users/ravindufernando/Documents/VSL360/vsl360-frontend-dist.tar.gz \
  -C dist .
```

### 4. Upload to the server

```bash
scp /Users/ravindufernando/Documents/VSL360/vsl360-frontend-dist.tar.gz \
adminvisitsrilan@91.204.209.39:/home/adminvisitsrilan/
```

### 5. Replace files in `public_html`

```bash
ssh adminvisitsrilan@91.204.209.39
```

```bash
find /home/adminvisitsrilan/public_html -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

tar -xzf /home/adminvisitsrilan/vsl360-frontend-dist.tar.gz -C /home/adminvisitsrilan/public_html
```

### 6. Verify frontend bundle points to the production API

Run locally:

```bash
curl -s https://admin.visitsrilanka360.com/assets/$(curl -s https://admin.visitsrilanka360.com | grep -o 'assets/index-[^"]*\.js' | head -n 1) | grep -o 'https://api.admin.visitsrilanka360.com/api' | head
```

Expected output:

```bash
https://api.admin.visitsrilanka360.com/api
```

### 7. Clear browser cache if UI still uses old assets

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

Note:

- Code rollback is easy
- Database rollback is not automatic
- Avoid destructive schema changes without backup planning

### Frontend rollback

Rebuild and upload a previous known-good `dist` package, or keep a copy of the previous tarball and re-extract it into `public_html`.

## Operational notes

- Root API URL returning `Cannot GET /` is normal because the backend serves routes under `/api`
- Keep `.htaccess` in `public_html`
- Keep `.well-known` in `public_html`
- Keep backend env outside app root if using destructive sync/deploy scripts
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
ssh adminvisitsrilan@91.204.209.39 '/home/adminvisitsrilan/deploy-vsl360-backend.sh'
```

### Frontend build

```bash
cd /Users/ravindufernando/Documents/VSL360/frontend && npm run build
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
