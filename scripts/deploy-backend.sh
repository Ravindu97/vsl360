#!/usr/bin/env bash
set -e

BRANCH="${1:-make-ready-for-depployment}"
RUN_SEED="${2:-no-seed}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE="/home/adminvisitsrilan/.config/vsl360/backend.env"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# Find npm-cli.js (native npm binary is broken on this server)
NPM_CLI="/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js"
if [ ! -f "$NPM_CLI" ]; then
  NPM_CLI="$(find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -1)"
fi
if [ ! -f "$NPM_CLI" ]; then echo "FATAL: npm-cli.js not found"; exit 1; fi

npm_run() { node "$NPM_CLI" "$@"; }

echo "===== SETUP ====="
echo "Node: $(node -v) | npm: $(npm_run -v)"

echo "===== GIT PULL ====="
cd "$REPO_ROOT"
git stash push --include-untracked -m "deploy-$(date +%s)" 2>/dev/null || true
git fetch origin
git checkout "$BRANCH" 2>/dev/null || true
git pull origin "$BRANCH"
echo "HEAD: $(git rev-parse --short HEAD)"

echo "===== STOP APP ====="
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"
sleep 2

echo "===== SYNC FILES ====="
mkdir -p "$APP_ROOT/uploads/documents"
find "$APP_ROOT" -mindepth 1 -maxdepth 1 ! -name uploads -exec rm -rf {} +
tar -cf - -C "$REPO_ROOT/backend" \
  --exclude=node_modules --exclude=.git --exclude=.env --exclude=.env.production --exclude=uploads \
  . | tar -xf - -C "$APP_ROOT"

echo "===== LOAD ENV ====="
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
  echo "Loaded $ENV_FILE"
else
  echo "WARNING: $ENV_FILE not found"
fi

echo "===== INSTALL ====="
cd "$APP_ROOT"

# NODE_ENV=production makes npm skip devDeps; override for install steps
SAVED_NODE_ENV="${NODE_ENV:-}"
export NODE_ENV=development

npm_run install --ignore-scripts --no-audit --no-fund
echo "Install done (postinstall scripts skipped)"

echo "===== BUILD TOOLS ====="
npm_run install --no-save --no-audit --no-fund --ignore-scripts \
  typescript prisma \
  @types/node @types/express @types/cors \
  @types/cookie-parser @types/bcrypt @types/jsonwebtoken @types/multer

echo "===== PRISMA GENERATE ====="
npm_run exec -- prisma generate
echo "Prisma client generated (engine downloaded)"

echo "===== BUILD ====="
npm_run run build
ls -la dist/index.js

# Restore NODE_ENV for runtime
export NODE_ENV="${SAVED_NODE_ENV:-production}"

echo "===== MIGRATE ====="
DB_URL="${DATABASE_URL:-}"
DB_URL_ALT="$(echo "$DB_URL" | sed 's/@localhost:/@127.0.0.1:/')"

if DATABASE_URL="$DB_URL" npm_run exec -- prisma migrate deploy; then
  echo "Migration done"
elif [ "$DB_URL_ALT" != "$DB_URL" ] && DATABASE_URL="$DB_URL_ALT" npm_run exec -- prisma migrate deploy; then
  echo "Migration done (127.0.0.1 fallback)"
else
  echo "FATAL: Migration failed"; exit 1
fi

if [ "$RUN_SEED" = "seed" ]; then
  echo "===== SEED ====="
  npm_run run db:seed
fi

echo "===== REBUILD NATIVE MODULES ====="
npm_run rebuild bcrypt 2>&1 || echo "bcrypt rebuild warning (may be ok)"

echo "===== RESTART ====="
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo ""
echo "==== BACKEND DEPLOY COMPLETE ===="
echo "Commit: $(cd "$REPO_ROOT" && git rev-parse --short HEAD)"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
