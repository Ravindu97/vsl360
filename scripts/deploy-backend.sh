#!/usr/bin/env bash
# ==========================================================================
# VSL360 Backend Deploy Script
# Usage: bash deploy-backend.sh [branch] [seed]
# ==========================================================================

set -e

BRANCH="${1:-make-ready-for-depployment}"
RUN_SEED="${2:-no-seed}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE="/home/adminvisitsrilan/.config/vsl360/backend.env"
ENV_FILE_FALLBACK="/home/adminvisitsrilan/vsl360-backend/.env.production"

# --------------------------------------------------------------------------
# 1. Setup Node.js and npm
# --------------------------------------------------------------------------
echo ""
echo "===== 1. SETUP NODE & NPM ====="

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  echo "FATAL: node not found in PATH"
  echo "PATH=$PATH"
  exit 1
fi
echo "Node: $NODE_BIN ($(node -v))"

# Always use node to invoke npm-cli.js directly.
# The native npm binary on this cPanel server is broken (core dumps).
NPM_CLI=""
for p in \
  "/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js" \
  "/opt/alt/alt-nodejs20/root/usr/lib64/node_modules/npm/bin/npm-cli.js" \
  "$(dirname "$(dirname "$NODE_BIN")")/lib/node_modules/npm/bin/npm-cli.js"
do
  if [ -f "$p" ]; then
    NPM_CLI="$p"
    break
  fi
done

if [ -z "$NPM_CLI" ]; then
  echo "npm-cli.js not at known paths, searching filesystem..."
  NPM_CLI="$(find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -1)"
fi

if [ -z "$NPM_CLI" ] || [ ! -f "$NPM_CLI" ]; then
  echo "FATAL: Cannot find npm-cli.js"
  echo "Searched: /opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js"
  echo "Also ran: find /opt/alt -name npm-cli.js"
  exit 1
fi

echo "npm-cli.js: $NPM_CLI"
echo "npm version: $(node "$NPM_CLI" -v)"

# --------------------------------------------------------------------------
# 2. Pull latest code
# --------------------------------------------------------------------------
echo ""
echo "===== 2. PULL LATEST CODE ====="

cd "$REPO_ROOT"
git stash push --include-untracked -m "backend-deploy-$(date +%s)" 2>/dev/null || true
git fetch origin
git checkout "$BRANCH" 2>/dev/null || true
git pull origin "$BRANCH"
echo "HEAD: $(git rev-parse --short HEAD)"

# --------------------------------------------------------------------------
# 3. Sync backend files to app root
# --------------------------------------------------------------------------
echo ""
echo "===== 3. SYNC FILES ====="

mkdir -p "$APP_ROOT/uploads/documents"

# Remove everything except uploads and node_modules
find "$APP_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name uploads \
  ! -name node_modules \
  ! -name node_modules_backup \
  -exec rm -rf {} +

# Copy backend source (excluding things we don't want)
tar -cf - \
  -C "$REPO_ROOT/backend" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  --exclude=.env.production \
  --exclude=uploads \
  . | tar -xf - -C "$APP_ROOT"

echo "Files synced to $APP_ROOT"

# --------------------------------------------------------------------------
# 4. Load environment
# --------------------------------------------------------------------------
echo ""
echo "===== 4. LOAD ENVIRONMENT ====="

ACTIVE_ENV=""
if [ -f "$ENV_FILE" ]; then
  ACTIVE_ENV="$ENV_FILE"
elif [ -f "$ENV_FILE_FALLBACK" ]; then
  ACTIVE_ENV="$ENV_FILE_FALLBACK"
fi

if [ -n "$ACTIVE_ENV" ]; then
  echo "Sourcing: $ACTIVE_ENV"
  set -a
  . "$ACTIVE_ENV"
  set +a
else
  echo "WARNING: No env file found, Prisma may fail"
fi

# --------------------------------------------------------------------------
# 5. Clean install dependencies
# --------------------------------------------------------------------------
echo ""
echo "===== 5. INSTALL DEPENDENCIES ====="

cd "$APP_ROOT"

# Backup existing node_modules (restore on failure so the app stays up)
if [ -d node_modules ]; then
  echo "Backing up existing node_modules..."
  rm -rf node_modules_backup
  mv node_modules node_modules_backup
fi

echo "Running: npm ci --omit=dev"
if node "$NPM_CLI" ci --omit=dev --no-audit --no-fund 2>&1; then
  echo "npm ci succeeded"
  rm -rf node_modules_backup
else
  echo "npm ci failed, trying npm install..."
  rm -rf node_modules
  if node "$NPM_CLI" install --omit=dev --no-audit --no-fund 2>&1; then
    echo "npm install succeeded"
    rm -rf node_modules_backup
  else
    echo "FATAL: npm install failed"
    rm -rf node_modules
    if [ -d node_modules_backup ]; then
      echo "Restoring previous node_modules..."
      mv node_modules_backup node_modules
    fi
    exit 1
  fi
fi

# --------------------------------------------------------------------------
# 6. Install build tools & compile
# --------------------------------------------------------------------------
echo ""
echo "===== 6. BUILD ====="

echo "Installing build toolchain..."
node "$NPM_CLI" install --include=dev --no-save --no-audit --no-fund \
  typescript \
  prisma \
  @types/node \
  @types/express \
  @types/cors \
  @types/cookie-parser \
  @types/bcrypt \
  @types/jsonwebtoken \
  @types/multer 2>&1

echo "Compiling TypeScript..."
node "$NPM_CLI" run build 2>&1
echo "Build output:"
ls -la dist/index.js 2>/dev/null || echo "WARNING: dist/index.js not found!"

# --------------------------------------------------------------------------
# 7. Prisma generate + migrate
# --------------------------------------------------------------------------
echo ""
echo "===== 7. DATABASE ====="

echo "Running prisma generate..."
node "$NPM_CLI" exec -- prisma generate 2>&1

# Determine the active database URL
DB_URL="${DATABASE_URL:-}"
if echo "$DB_URL" | grep -q '@localhost:'; then
  DB_URL_FALLBACK="$(echo "$DB_URL" | sed 's/@localhost:/@127.0.0.1:/')"
else
  DB_URL_FALLBACK="$DB_URL"
fi

echo "Running prisma migrate deploy..."
attempt=1
max_attempts=5
migrate_done=false
while [ "$attempt" -le "$max_attempts" ]; do
  if DATABASE_URL="$DB_URL" node "$NPM_CLI" exec -- prisma migrate deploy 2>&1; then
    echo "Migration succeeded"
    migrate_done=true
    break
  fi

  # Try fallback URL on first failure
  if [ "$attempt" -eq 1 ] && [ "$DB_URL_FALLBACK" != "$DB_URL" ]; then
    echo "Trying 127.0.0.1 instead of localhost..."
    if DATABASE_URL="$DB_URL_FALLBACK" node "$NPM_CLI" exec -- prisma migrate deploy 2>&1; then
      echo "Migration succeeded with 127.0.0.1"
      migrate_done=true
      break
    fi
  fi

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "FATAL: Migration failed after $max_attempts attempts"
    exit 1
  fi

  sleep_time=$((attempt * 10))
  echo "Migration attempt $attempt/$max_attempts failed, retrying in ${sleep_time}s..."
  attempt=$((attempt + 1))
  sleep "$sleep_time"
done

# --------------------------------------------------------------------------
# 8. Optional seed
# --------------------------------------------------------------------------
if [ "$RUN_SEED" = "seed" ]; then
  echo ""
  echo "===== 8. SEED DATABASE ====="
  node "$NPM_CLI" run db:seed 2>&1
fi

# --------------------------------------------------------------------------
# 9. Restart application
# --------------------------------------------------------------------------
echo ""
echo "===== 9. RESTART APP ====="

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"
echo "Touched restart.txt"

echo ""
echo "========================================"
echo "  BACKEND DEPLOY COMPLETE"
echo "  Branch: $BRANCH"
echo "  Commit: $(cd "$REPO_ROOT" && git rev-parse --short HEAD)"
echo "  Time:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
