# VSL360 Deployment Runbook (VPS / Docker)

## Production topology

- Frontend: `https://admin.visitsrilanka360.com`
- Backend API: `https://api.admin.visitsrilanka360.com`
- Health check: `https://api.admin.visitsrilanka360.com/api/health`
- VPS: Hetzner (`89.167.27.46`)
- OS: Ubuntu / Debian
- Container runtime: Docker Compose
- Reverse proxy: Nginx on host with Let's Encrypt SSL

## Architecture

```
Internet → Nginx (host, ports 80/443, SSL termination)
  ├─ admin.visitsrilanka360.com     → frontend container (Nginx :8080)
  └─ api.admin.visitsrilanka360.com → backend container (Express :3000)
       └─ PostgreSQL container (5432, internal docker network)

Volumes:
  pgdata  → PostgreSQL data (persists across rebuilds)
  uploads → Backend file uploads (persists across rebuilds)

Host bind mount:
  ./assets → /app/assets (read-only) on backend — logos for PDF generation (`DOCUMENT_LOGO_PATH`, etc.)
```

## VPS initial setup

Run these steps once when provisioning the server.

### 1. SSH in and update

```bash
ssh root@89.167.27.46
apt update && apt upgrade -y
```

### 2. Create deploy user

```bash
adduser deploy
usermod -aG sudo deploy

# Set up SSH key auth for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3. Disable root password login

Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
systemctl restart sshd
```

### 4. Configure firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 5. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Log out and back in as `deploy` for group changes to take effect.

### 6. Clone repository

```bash
sudo mkdir -p /opt/vsl360
sudo chown deploy:deploy /opt/vsl360
git clone https://github.com/Ravindu97/vsl360.git /opt/vsl360
cd /opt/vsl360
git checkout make-ready-for-depployment
```

### 7. Create production env file

```bash
nano .env.production
```

Create `/opt/vsl360/.env.production` with at least the following (replace placeholders with real secrets):

```env
COMPOSE_ENV_FILE=.env.production
POSTGRES_USER=vsl360
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=vsl360
JWT_SECRET=<generate-64-char-random>
JWT_REFRESH_SECRET=<generate-64-char-random>
CORS_ORIGIN=https://admin.visitsrilanka360.com
CORS_ORIGINS=https://admin.visitsrilanka360.com,https://www.admin.visitsrilanka360.com
UPLOAD_DIR=/app/uploads
PORT=3000
VITE_API_URL=https://api.admin.visitsrilanka360.com/api
# Optional — PDF branding (ensure assets exist under repo ./assets)
# DOCUMENT_LOGO_PATH=/app/assets/logo.png
```

**Compose note:** always pass `--env-file .env.production` to `docker compose` on the VPS so `${POSTGRES_PASSWORD}` and other variables interpolate correctly (matches [docker-compose.yml](docker-compose.yml)).

Generate secrets:

```bash
openssl rand -hex 32  # run twice, one for each JWT secret
openssl rand -base64 24  # for POSTGRES_PASSWORD
```

### 8. Install host Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/vsl360-frontend`:

```nginx
server {
    listen 80;
    server_name admin.visitsrilanka360.com www.admin.visitsrilanka360.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Create `/etc/nginx/sites-available/vsl360-api`:

```nginx
server {
    listen 80;
    server_name api.admin.visitsrilanka360.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable sites and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/vsl360-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/vsl360-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificates (after DNS is pointed to this server)
sudo certbot --nginx -d admin.visitsrilanka360.com -d www.admin.visitsrilanka360.com
sudo certbot --nginx -d api.admin.visitsrilanka360.com
```

### 9. Update DNS

In Spaceship (or your DNS provider), update A records:

| Type | Host | Value |
|------|------|-------|
| A | admin | 89.167.27.46 |
| A | api.admin | 89.167.27.46 |

Wait for DNS propagation before running Certbot.

## Database setup

### Import from local development database

On your local machine:

```bash
pg_dump -U ravindufernando -d vsl360 --no-owner --no-acl > vsl360_dump.sql
scp vsl360_dump.sql deploy@89.167.27.46:/opt/vsl360/
```

On the VPS:

```bash
cd /opt/vsl360

# Start only the database container
docker compose --env-file .env.production up -d db

# Wait for it to be healthy
docker compose --env-file .env.production exec db pg_isready -U vsl360

# Import the dump
docker compose --env-file .env.production exec -T db psql -U vsl360 -d vsl360 < vsl360_dump.sql

# Verify
docker compose --env-file .env.production exec db psql -U vsl360 -d vsl360 -c "SELECT count(*) FROM \"User\";"
```

### Create empty database (fresh start)

If starting fresh instead of importing:

```bash
cd /opt/vsl360
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production up -d backend
docker compose --env-file .env.production exec backend npx prisma migrate deploy
docker compose --env-file .env.production exec backend npx tsx prisma/seed.ts
```

## Deploy

Use **`docker compose --env-file .env.production`** from `/opt/vsl360` so database credentials and build args resolve correctly.

### First deploy (manual, env file on disk)

After creating `.env.production` with your real secrets:

```bash
cd /opt/vsl360
docker compose --env-file .env.production up -d --build
```

### Run migrations (after schema changes)

```bash
cd /opt/vsl360
docker compose --env-file .env.production exec backend npx prisma migrate deploy
```

### Run seed (if needed)

```bash
cd /opt/vsl360
docker compose --env-file .env.production exec backend npx tsx prisma/seed.ts
```

## GitHub Actions CI/CD

Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — **workflow_dispatch** only, GitHub **Environment** name: `production`.

### Repository / environment secrets

**SSH (repo secrets — used by the workflow to reach the VPS):**

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP or DNS (e.g. `89.167.27.46`) |
| `VPS_USER` | SSH user (e.g. `deploy`) |
| `VPS_SSH_KEY` | Private key (full PEM) for that user |

**Application (Environment `production` — used to render `/opt/vsl360/.env.production` on the server):**

| Secret | Required |
|--------|----------|
| `POSTGRES_USER` | Yes |
| `POSTGRES_PASSWORD` | Yes |
| `POSTGRES_DB` | Yes |
| `JWT_SECRET` | Yes |
| `JWT_REFRESH_SECRET` | Yes |
| `CORS_ORIGIN` | Yes |
| `CORS_ORIGINS` | Yes |
| `VITE_API_URL` | Yes (baked into frontend image at build) |
| `UPLOAD_DIR` | No (defaults to `/app/uploads` in workflow) |
| `PORT` | No (defaults to `3000`) |
| `DOCUMENT_LOGO_PATH` | No |
| `DOCUMENT_INVOICE_LOGO_PATH` | No |
| `DOCUMENT_THEME_PATH` | No |
| `DOCUMENT_LOGO_URL` | No |
| `DOCUMENT_INVOICE_LOGO_URL` | No |

Remove any unused **legacy** repository secrets (e.g. old `CPANEL_*` names) so they are not confused with current VPS deploy.

### How to deploy

1. Ensure the branch you want exists on `origin`.
2. GitHub → **Actions** → **Deploy Production** → **Run workflow**.
3. Set **branch** and **target** (`backend`, `frontend`, or `both`).
4. After completion, verify API health and the admin UI.

### What the workflow does

1. SSH to `VPS_HOST` as `VPS_USER`.
2. `cd /opt/vsl360`, `git fetch`, checkout/pull the selected branch.
3. Validate required environment secrets are present.
4. Write `/opt/vsl360/.env.production` from those secrets (`chmod 600`).
5. Print optional-variable **set / not set** lines (values are not logged).
6. `docker compose --env-file .env.production build <target>` and `up -d <target>`.
7. Health check: `curl -sf http://localhost:3000/api/health`.

Manual deploys on the VPS can keep a long-lived `.env.production` file instead of relying on step 4–5; CI overwrites the file each run with the latest secrets.

## Docker services

| Service | Image | Port | Volume |
|---------|-------|------|--------|
| `db` | `postgres:16-alpine` | 5432 (internal) | `pgdata` |
| `backend` | Custom (Node 20 + Chromium) | 3000 | `uploads`, `./assets` → `/app/assets` |
| `frontend` | Custom (Nginx alpine) | 8080 | — |

## Common operations

### View logs

```bash
# All services
docker compose --env-file .env.production logs -f

# Specific service
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f db

# Last 100 lines
docker compose --env-file .env.production logs --tail 100 backend
```

### Restart a service

```bash
docker compose --env-file .env.production restart backend
docker compose --env-file .env.production restart frontend
```

### Rebuild and restart

```bash
docker compose --env-file .env.production up -d --build backend
docker compose --env-file .env.production up -d --build frontend
```

### Access database shell

```bash
docker compose --env-file .env.production exec db psql -U vsl360 -d vsl360
```

### Backup database

```bash
docker compose --env-file .env.production exec db pg_dump -U vsl360 vsl360 > backup_$(date +%F).sql
```

### Restore database

```bash
docker compose --env-file .env.production exec -T db psql -U vsl360 -d vsl360 < backup_2026-04-18.sql
```

### Check container status

```bash
docker compose --env-file .env.production ps
```

### Stop everything

```bash
docker compose --env-file .env.production down        # stop containers (data preserved in volumes)
docker compose --env-file .env.production down -v     # stop AND delete volumes (DESTROYS DATA)
```

## Rollback

### Code rollback

```bash
cd /opt/vsl360
git log --oneline -n 10
git checkout <previous_commit>
docker compose --env-file .env.production up -d --build backend   # or frontend, or both
```

### Database rollback

Database rollback is NOT automatic. Always backup before destructive migrations:

```bash
# Backup before migration
docker compose --env-file .env.production exec db pg_dump -U vsl360 vsl360 > pre_migration_backup.sql

# Run migration
docker compose --env-file .env.production exec backend npx prisma migrate deploy

# If something goes wrong, restore
docker compose --env-file .env.production exec -T db psql -U vsl360 -d vsl360 < pre_migration_backup.sql
```

## Environment variables reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COMPOSE_ENV_FILE` | Yes (in `.env.production`) | `.env.production` | Which file `env_file:` in [docker-compose.yml](docker-compose.yml) loads |
| `POSTGRES_USER` | Yes | `vsl360` | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password |
| `POSTGRES_DB` | Yes | `vsl360` | PostgreSQL database name |
| `DATABASE_URL` | Auto | — | Auto-generated from POSTGRES_* vars in docker-compose |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | JWT refresh token secret |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Primary allowed CORS origin |
| `CORS_ORIGINS` | No | — | Comma-separated list of allowed origins |
| `UPLOAD_DIR` | No | `/app/uploads` | Upload directory inside container |
| `PORT` | No | `3000` | Backend server port |
| `VITE_API_URL` | Yes | — | API URL baked into frontend at build time |
| `DOCUMENT_LOGO_PATH` | No | — | Host path inside backend container for invoice/PDF logo (e.g. `/app/assets/logo.png`) |
| `DOCUMENT_INVOICE_LOGO_PATH` | No | — | Optional alternate logo for some documents |
| `DOCUMENT_THEME_PATH` | No | — | Optional theme image for templates |
| `DOCUMENT_LOGO_URL` | No | — | Optional HTTPS URL for logo if not using files |
| `DOCUMENT_INVOICE_LOGO_URL` | No | — | Optional URL for invoice logo |

## Automated backups (recommended)

Create a cron job on the VPS:

```bash
sudo mkdir -p /opt/backups/vsl360
sudo chown deploy:deploy /opt/backups/vsl360
crontab -e
```

Add:

```cron
0 2 * * * cd /opt/vsl360 && docker compose --env-file .env.production exec -T db pg_dump -U vsl360 vsl360 | gzip > /opt/backups/vsl360/vsl360_$(date +\%F).sql.gz && find /opt/backups/vsl360 -name "*.sql.gz" -mtime +7 -delete
```

This runs daily at 2 AM, keeps 7 days of backups.

## Verification checklist

### After every deploy

1. Health check: `curl -i https://api.admin.visitsrilanka360.com/api/health` → HTTP 200
2. Open `https://admin.visitsrilanka360.com` → login page loads
3. Login with `admin@vsl360.com` / `admin123`
4. Create a test booking → verify it saves
5. Upload an attachment → verify it persists
6. Generate invoice PDF → verify it downloads (tests Puppeteer/Chrome)

### Container health

```bash
docker compose --env-file .env.production ps    # all containers should show "Up" / "healthy"
docker compose --env-file .env.production logs --tail 20 backend  # no errors
```

## Quick reference

| Action | Command |
|--------|---------|
| Deploy (CI/CD) | GitHub Actions → Deploy Production |
| Deploy (manual) | `cd /opt/vsl360 && git pull && docker compose --env-file .env.production up -d --build` |
| Run migrations | `docker compose --env-file .env.production exec backend npx prisma migrate deploy` |
| Run seed | `docker compose --env-file .env.production exec backend npx tsx prisma/seed.ts` |
| View logs | `docker compose --env-file .env.production logs -f backend` |
| Backup DB | `docker compose --env-file .env.production exec db pg_dump -U vsl360 vsl360 > backup.sql` |
| DB shell | `docker compose --env-file .env.production exec db psql -U vsl360 -d vsl360` |
| Health check | `curl -i https://api.admin.visitsrilanka360.com/api/health` |
| Frontend URL | `https://admin.visitsrilanka360.com` |
| Backend URL | `https://api.admin.visitsrilanka360.com/api` |
