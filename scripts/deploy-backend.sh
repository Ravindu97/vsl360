#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# VSL360 Backend Deploy Script
# Usage: deploy-backend.sh [branch] [seed]
# ============================================================================

BRANCH="${1:-make-ready-for-depployment}"
RUN_SEED="${2:-no-seed}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
APP_ROOT="/home/adminvisitsrilan/vsl360-backend"
ENV_FILE_PRIMARY="/home/adminvisitsrilan/.config/vsl360/backend.env"
ENV_FILE_FALLBACK="/home/adminvisitsrilan/vsl360-backend/.env.production"

# --- Logging helpers --------------------------------------------------------
step()  { echo ""; echo "=== STEP: $* ==="; }
info()  { echo "    [INFO]  $*"; }
warn()  { echo "    [WARN]  $*"; }
fail()  { echo "    [ERROR] $*"; exit 1; }

# --- Trap: print context on any unexpected failure --------------------------
trap 'echo ""; echo "!!! DEPLOY FAILED at line $LINENO (exit code $?) !!!"; echo "!!! Last command: $BASH_COMMAND !!!"' ERR

# ============================================================================
# 1. Resolve Node.js & npm
# ============================================================================
step "Resolving Node.js and npm"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  fail "node not found in PATH"
fi
info "Node binary: $NODE_BIN"
info "Node version: $(node -v)"

# Check if native npm works (the binary may core-dump on broken servers)
# We must disable set -e for this probe since the crash returns non-zero
NPM_NATIVE_OK=false
if command -v npm &>/dev/null; then
  set +e
  npm -v >/dev/null 2>&1
  npm_exit=$?
  set -e
  if [[ "$npm_exit" -eq 0 ]]; then
    NPM_NATIVE_OK=true
    info "Native npm works: $(npm -v)"
  else
    warn "Native npm binary crashed (exit $npm_exit) — will use node-direct fallback"
  fi
else
  warn "npm binary not found in PATH"
fi

# If native npm is broken, find npm-cli.js and invoke via node
NPM_CLI_JS=""
NPX_CLI_JS=""
if [[ "$NPM_NATIVE_OK" == "false" ]]; then
  NODE_PREFIX="$(dirname "$(dirname "$NODE_BIN")")"

  for candidate in \
    "$NODE_PREFIX/lib/node_modules/npm/bin/npm-cli.js" \
    "$NODE_PREFIX/lib64/node_modules/npm/bin/npm-cli.js" \
    "/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js" \
    "/opt/alt/alt-nodejs20/root/usr/lib64/node_modules/npm/bin/npm-cli.js"
  do
    if [[ -f "$candidate" ]]; then
      NPM_CLI_JS="$candidate"
      break
    fi
  done

  # Last resort: ask node to resolve it
  if [[ -z "$NPM_CLI_JS" ]]; then
    set +e
    NPM_CLI_JS="$(node -e 'try{console.log(require.resolve("npm/bin/npm-cli"))}catch(e){process.exit(1)}' 2>/dev/null)"
    set -e
  fi

  if [[ -z "$NPM_CLI_JS" || ! -f "$NPM_CLI_JS" ]]; then
    warn "Could not auto-discover npm-cli.js. Searching filesystem..."
    find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -5 || true
    fail "npm-cli.js not found — cannot proceed without a working npm"
  fi

  info "Using npm-cli.js: $NPM_CLI_JS"

  # Find npx entry point
  NPM_DIR="$(dirname "$NPM_CLI_JS")"
  for npx_candidate in "$NPM_DIR/npx-cli-entry.js" "$NPM_DIR/npx-cli.cjs"; do
    if [[ -f "$npx_candidate" ]]; then
      NPX_CLI_JS="$npx_candidate"
      break
    fi
  done
  [[ -n "$NPX_CLI_JS" ]] && info "Using npx entry: $NPX_CLI_JS" || info "npx entry not found; will use 'npm exec' fallback"

  # Verify the fallback actually works
  set +e
  node "$NPM_CLI_JS" -v >/dev/null 2>&1
  verify_exit=$?
  set -e
  if [[ "$verify_exit" -ne 0 ]]; then
    fail "node $NPM_CLI_JS -v also failed (exit $verify_exit) — npm is completely broken on this server"
  fi
  info "npm (via node) version: $(node "$NPM_CLI_JS" -v)"
fi

# Wrapper functions
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

retry_cmd() {
  local max_attempts="$1"
  local sleep_seconds="$2"
  shift 2
  local attempt=1

  until "$@"; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      warn "Command failed after ${max_attempts} attempts: $*"
      return 1
    fi
    info "Attempt ${attempt}/${max_attempts} failed; retrying in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
}

# ============================================================================
# 2. Update source from Git
# ============================================================================
step "Updating source from Git"

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  fail "Repo not found at $REPO_ROOT"
fi

cd "$REPO_ROOT"
if [[ -n "$(git status --porcelain)" ]]; then
  info "Stashing local changes"
  git stash push --include-untracked -m "backend-deploy-auto-stash-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
fi

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
info "HEAD is now $(git rev-parse --short HEAD)"

# ============================================================================
# 3. Sync files to app root
# ============================================================================
step "Syncing backend files to $APP_ROOT"

mkdir -p "$APP_ROOT/uploads/documents"

# Remove everything except uploads and node_modules (which is handled in install step)
find "$APP_ROOT" -mindepth 1 -maxdepth 1 ! -name uploads ! -name node_modules ! -name node_modules_backup -exec rm -rf {} +

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
info "Files synced"

# ============================================================================
# 4. Load environment
# ============================================================================
step "Loading environment"

ENV_FILE=""
if [[ -f "$ENV_FILE_PRIMARY" ]]; then
  ENV_FILE="$ENV_FILE_PRIMARY"
elif [[ -f "$ENV_FILE_FALLBACK" ]]; then
  ENV_FILE="$ENV_FILE_FALLBACK"
fi

if [[ -n "$ENV_FILE" ]]; then
  info "Sourcing $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  warn "No env file found — Prisma steps may fail"
fi

# ============================================================================
# 5. Install dependencies (clean install with safe rollback)
# ============================================================================
step "Installing production dependencies"

cd "$APP_ROOT"

# Backup existing node_modules so we can restore if install fails
if [[ -d node_modules ]]; then
  info "Backing up existing node_modules"
  rm -rf node_modules_backup
  mv node_modules node_modules_backup
fi

install_ok=false

# Try 1: npm ci (deterministic clean install from lockfile)
info "Attempting npm ci..."
if retry_cmd 3 8 npm_cmd ci --omit=dev --no-audit --no-fund; then
  info "npm ci succeeded"
  install_ok=true
else
  warn "npm ci failed — falling back to npm install"
  rm -rf node_modules

  # Try 2: npm install
  info "Attempting npm install..."
  if retry_cmd 3 8 npm_cmd install --omit=dev --no-audit --no-fund; then
    info "npm install succeeded"
    install_ok=true
  fi
fi

if [[ "$install_ok" == "true" ]]; then
  rm -rf node_modules_backup
else
  warn "All install attempts failed — restoring previous node_modules"
  rm -rf node_modules
  if [[ -d node_modules_backup ]]; then
    mv node_modules_backup node_modules
    warn "Restored backup. App may still run with old deps."
  fi
  fail "Could not install dependencies"
fi

# ============================================================================
# 6. Install build toolchain & build
# ============================================================================
step "Installing build toolchain"

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

step "Compiling TypeScript"

retry_cmd 2 5 npm_cmd run build
info "Build output: $(ls -1 dist/ | head -5) ..."

# ============================================================================
# 7. Prisma generate + migrate
# ============================================================================
step "Running Prisma generate"

npx_cmd prisma generate

step "Checking database connectivity"

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
    info "DB not ready (attempt ${attempt}/${max_attempts}); retrying in ${sleep_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
  return 0
}

ACTIVE_DATABASE_URL="$DB_URL_PRIMARY"
if ! db_ready_check "$ACTIVE_DATABASE_URL"; then
  if [[ "$DB_URL_FALLBACK" != "$DB_URL_PRIMARY" ]] && db_ready_check "$DB_URL_FALLBACK"; then
    info "Using 127.0.0.1 fallback (localhost was unreachable)"
    ACTIVE_DATABASE_URL="$DB_URL_FALLBACK"
  else
    fail "Database unreachable on both localhost and 127.0.0.1"
  fi
fi

step "Running Prisma migrations"

migrate_attempt=1
migrate_max=5
until DATABASE_URL="$ACTIVE_DATABASE_URL" npx_cmd prisma migrate deploy; do
  if [[ "$migrate_attempt" -ge "$migrate_max" ]]; then
    fail "Prisma migrate deploy failed after ${migrate_max} attempts"
  fi
  sleep_seconds=$((migrate_attempt * 10))
  info "Migration failed (attempt ${migrate_attempt}/${migrate_max}); retrying in ${sleep_seconds}s..."
  migrate_attempt=$((migrate_attempt + 1))
  sleep "$sleep_seconds"
done

# ============================================================================
# 8. Optional seed
# ============================================================================
if [[ "$RUN_SEED" == "seed" ]]; then
  step "Running database seed"
  npm_cmd run db:seed
fi

# ============================================================================
# 9. Restart app
# ============================================================================
step "Restarting application"

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo ""
echo "============================================"
echo "  DEPLOY COMPLETED SUCCESSFULLY"
echo "  Branch: $BRANCH"
echo "  Commit: $(cd "$REPO_ROOT" && git rev-parse --short HEAD)"
echo "  Time:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================"