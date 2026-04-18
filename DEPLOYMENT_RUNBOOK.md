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
cp .env.production.example .env.production
nano .env.production
```

Fill in real values:

```env
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
```

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
pg_dump -U postgres -d vsl360 --no-owner --no-acl > vsl360_dump.sql
scp vsl360_dump.sql deploy@89.167.27.46:/opt/vsl360/
```

On the VPS:

```bash
cd /opt/vsl360

# Start only the database container
docker compose up -d db

# Wait for it to be healthy
docker compose exec db pg_isready -U vsl360

# Import the dump
docker compose exec -T db psql -U vsl360 -d vsl360 < vsl360_dump.sql

# Verify
docker compose exec db psql -U vsl360 -d vsl360 -c "SELECT count(*) FROM \"User\";"
```

### Create empty database (fresh start)

If starting fresh instead of importing:

```bash
cd /opt/vsl360
docker compose up -d db
docker compose up -d backend
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```

## Deploy

### First deploy

```bash
cd /opt/vsl360
docker compose up -d --build
```

### Run migrations (after schema changes)

```bash
docker compose exec backend npx prisma migrate deploy
```

### Run seed (if needed)

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

## GitHub Actions CI/CD

### Required GitHub secrets

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `89.167.27.46` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private SSH key for the deploy user |

Remove old cPanel secrets (`CPANEL_*`) after migration is verified.

### How to deploy

1. Push code to `make-ready-for-depployment`
2. Go to GitHub Actions → "Deploy Production"
3. Click "Run workflow"
4. Choose target: `backend`, `frontend`, or `both`
5. Verify health check and UI after completion

### What the workflow does

1. SSH into VPS as `deploy` user
2. `cd /opt/vsl360 && git pull`
3. `docker compose build <target>`
4. `docker compose up -d <target>`
5. Health check: `curl http://localhost:3000/api/health`

## Docker services

| Service | Image | Port | Volume |
|---------|-------|------|--------|
| `db` | `postgres:16-alpine` | 5432 (internal) | `pgdata` |
| `backend` | Custom (Node 20 + Chromium) | 3000 | `uploads` |
| `frontend` | Custom (Nginx alpine) | 8080 | — |

## Common operations

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f db

# Last 100 lines
docker compose logs --tail 100 backend
```

### Restart a service

```bash
docker compose restart backend
docker compose restart frontend
```

### Rebuild and restart

```bash
docker compose up -d --build backend
docker compose up -d --build frontend
```

### Access database shell

```bash
docker compose exec db psql -U vsl360 -d vsl360
```

### Backup database

```bash
docker compose exec db pg_dump -U vsl360 vsl360 > backup_$(date +%F).sql
```

### Restore database

```bash
docker compose exec -T db psql -U vsl360 -d vsl360 < backup_2026-04-18.sql
```

### Check container status

```bash
docker compose ps
```

### Stop everything

```bash
docker compose down        # stop containers (data preserved in volumes)
docker compose down -v     # stop AND delete volumes (DESTROYS DATA)
```

## Rollback

### Code rollback

```bash
cd /opt/vsl360
git log --oneline -n 10
git checkout <previous_commit>
docker compose up -d --build backend   # or frontend, or both
```

### Database rollback

Database rollback is NOT automatic. Always backup before destructive migrations:

```bash
# Backup before migration
docker compose exec db pg_dump -U vsl360 vsl360 > pre_migration_backup.sql

# Run migration
docker compose exec backend npx prisma migrate deploy

# If something goes wrong, restore
docker compose exec -T db psql -U vsl360 -d vsl360 < pre_migration_backup.sql
```

## Environment variables reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
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

## Automated backups (recommended)

Create a cron job on the VPS:

```bash
sudo mkdir -p /opt/backups/vsl360
sudo chown deploy:deploy /opt/backups/vsl360
crontab -e
```

Add:

```cron
0 2 * * * cd /opt/vsl360 && docker compose exec -T db pg_dump -U vsl360 vsl360 | gzip > /opt/backups/vsl360/vsl360_$(date +\%F).sql.gz && find /opt/backups/vsl360 -name "*.sql.gz" -mtime +7 -delete
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
docker compose ps    # all containers should show "Up" / "healthy"
docker compose logs --tail 20 backend  # no errors
```

## Quick reference

| Action | Command |
|--------|---------|
| Deploy (CI/CD) | GitHub Actions → Deploy Production |
| Deploy (manual) | `cd /opt/vsl360 && git pull && docker compose up -d --build` |
| Run migrations | `docker compose exec backend npx prisma migrate deploy` |
| Run seed | `docker compose exec backend npx tsx prisma/seed.ts` |
| View logs | `docker compose logs -f backend` |
| Backup DB | `docker compose exec db pg_dump -U vsl360 vsl360 > backup.sql` |
| DB shell | `docker compose exec db psql -U vsl360 -d vsl360` |
| Health check | `curl -i https://api.admin.visitsrilanka360.com/api/health` |
| Frontend URL | `https://admin.visitsrilanka360.com` |
| Backend URL | `https://api.admin.visitsrilanka360.com/api` |
