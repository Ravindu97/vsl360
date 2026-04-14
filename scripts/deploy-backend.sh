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
echo "==> Fetching branch: $BRANCH"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "==> Repository has local changes; stashing before deploy"
  git stash push --include-untracked -m "backend-deploy-auto-stash-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
fi
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

mkdir -p "$APP_ROOT/uploads/documents"

echo "==> Syncing backend files to app root"
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
  echo "==> Loading env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "WARNING: No env file found. Prisma steps may fail if env vars are not exported."
fi

cd "$APP_ROOT"

echo "==> Installing dependencies"
rm -rf node_modules
npm install --omit=dev

echo "==> Installing minimal build toolchain"
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

echo "==> Building"
npm run build

echo "==> Prisma generate + migrate"
npx prisma generate

DB_URL_PRIMARY="${DATABASE_URL:-}"
DB_URL_FALLBACK="$DB_URL_PRIMARY"
if [[ "$DB_URL_PRIMARY" == *"@localhost:"* ]]; then
  DB_URL_FALLBACK="${DB_URL_PRIMARY/@localhost:/@127.0.0.1:}"
fi

db_ready_check() {
  local db_url="$1"
  local max_attempts=6
  local attempt=1

  until psql "$db_url" -c "select 1;" >/dev/null 2>&1; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      return 1
    fi

    local sleep_seconds=$((attempt * 5))
    echo "Database is not ready yet (attempt ${attempt}/${max_attempts}); retrying in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done

  return 0
}

ACTIVE_DATABASE_URL="$DB_URL_PRIMARY"
if ! db_ready_check "$ACTIVE_DATABASE_URL"; then
  if [[ "$DB_URL_FALLBACK" != "$DB_URL_PRIMARY" ]] && db_ready_check "$DB_URL_FALLBACK"; then
    echo "Primary DB URL with localhost is unreachable in this session; using 127.0.0.1 fallback"
    ACTIVE_DATABASE_URL="$DB_URL_FALLBACK"
  else
    echo "ERROR: Database readiness check failed for primary and fallback URLs"
    exit 1
  fi
fi

retry_migrate() {
  local max_attempts=5
  local attempt=1

  until DATABASE_URL="$ACTIVE_DATABASE_URL" npx prisma migrate deploy; do
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
  echo "==> Running seed"
  npm run db:seed
fi

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy completed successfully"