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
npm install --no-save \
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
npx prisma migrate deploy

if [[ "$RUN_SEED" == "seed" ]]; then
  echo "==> Running seed"
  npm run db:seed
fi

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy completed successfully"