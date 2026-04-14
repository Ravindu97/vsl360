#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"
RUN_SEED="${2:-no-seed}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE_PRIMARY="/home/adminvisitsrilan/.config/vsl360/backend.env"
ENV_FILE_FALLBACK="/home/adminvisitsrilan/vsl360-backend/.env.production"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# --- npm wrapper: bypass broken npm binary by invoking via node directly ---
# Detect once whether the native npm binary works (suppress core dump noise)
NPM_NATIVE_OK=false
if command -v npm &>/dev/null && npm -v >/dev/null 2>&1; then
  NPM_NATIVE_OK=true
fi

# Auto-discover npm-cli.js relative to the node binary
NPM_CLI_JS=""
NPX_CLI_JS=""
if [[ "$NPM_NATIVE_OK" == "false" ]]; then
  NODE_BIN="$(command -v node)"
  NODE_PREFIX="$(dirname "$(dirname "$NODE_BIN")")"

  # Try standard location relative to node binary
  for candidate in \
    "$NODE_PREFIX/lib/node_modules/npm/bin/npm-cli.js" \
    "$NODE_PREFIX/lib64/node_modules/npm/bin/npm-cli.js" \
    "/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js" \
    "$(node -e 'try{console.log(require.resolve("npm/bin/npm-cli"))}catch(e){}' 2>/dev/null)"
  do
    if [[ -n "$candidate" && -f "$candidate" ]]; then
      NPM_CLI_JS="$candidate"
      break
    fi
  done

  # Discover npx entry
  if [[ -n "$NPM_CLI_JS" ]]; then
    NPM_DIR="$(dirname "$NPM_CLI_JS")"
    for npx_candidate in \
      "$NPM_DIR/npx-cli-entry.js" \
      "$NPM_DIR/npx-cli.cjs"
    do
      if [[ -f "$npx_candidate" ]]; then
        NPX_CLI_JS="$npx_candidate"
        break
      fi
    done
  fi

  echo "==> npm binary is broken; using node-direct mode"
  echo "    NPM_CLI_JS=$NPM_CLI_JS"
  echo "    NPX_CLI_JS=$NPX_CLI_JS"

  if [[ -z "$NPM_CLI_JS" ]]; then
    echo "ERROR: Could not find npm-cli.js anywhere. Searched:"
    echo "  NODE_BIN=$NODE_BIN"
    echo "  NODE_PREFIX=$NODE_PREFIX"
    find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -5 || true
    exit 1
  fi
fi

npm_cmd() {
  if [[ "$NPM_NATIVE_OK" == "true" ]]; then
    npm "$@"
  else
    node "$NPM_CLI_JS" "$@"
  fi
}

npx_cmd() {
  if [[ "$NPM_NATIVE_OK" == "true" ]]; then
    npx "$@"
  elif [[ -n "$NPX_CLI_JS" ]]; then
    node "$NPX_CLI_JS" "$@"
  else
    node "$NPM_CLI_JS" exec -- "$@"
  fi
}

echo "==> Using Node: $(node -v)"
echo "==> Using npm:  $(npm_cmd -v)"

retry_cmd() {
  local max_attempts="$1"
  local sleep_seconds="$2"
  shift 2

  local attempt=1
  until "$@"; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      echo "ERROR: Command failed after ${max_attempts} attempts: $*"
      return 1
    fi

    echo "Command failed (attempt ${attempt}/${max_attempts}); retrying in ${sleep_seconds}s: $*"
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
}

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
# Preserve uploads during sync; node_modules handled separately in install step
find "$APP_ROOT" -mindepth 1 -maxdepth 1 ! -name uploads ! -name node_modules -exec rm -rf {} +

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

echo "==> Clean installing dependencies"
# Backup node_modules so we can restore if install fails (keeps app running)
if [[ -d node_modules ]]; then
  mv node_modules node_modules_backup
fi

if retry_cmd 3 8 npm_cmd ci --omit=dev --no-audit --no-fund; then
  echo "    Clean install succeeded"
  rm -rf node_modules_backup
else
  echo "WARNING: npm ci failed, falling back to npm install"
  rm -rf node_modules
  if retry_cmd 3 8 npm_cmd install --omit=dev --no-audit --no-fund; then
    echo "    npm install succeeded"
    rm -rf node_modules_backup
  else
    echo "ERROR: npm install also failed; restoring previous node_modules"
    rm -rf node_modules
    if [[ -d node_modules_backup ]]; then
      mv node_modules_backup node_modules
    fi
    exit 1
  fi
fi

echo "==> Installing minimal build toolchain"
retry_cmd 3 8 npm_cmd install --include=dev --no-save --no-audit --no-fund \
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
retry_cmd 2 5 npm_cmd run build

echo "==> Prisma generate + migrate"
npx_cmd prisma generate

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

  until DATABASE_URL="$ACTIVE_DATABASE_URL" npx_cmd prisma migrate deploy; do
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
  npm_cmd run db:seed
fi

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy completed successfully"