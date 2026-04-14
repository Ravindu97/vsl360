#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# VSL360 Frontend Deploy Script
# Usage: deploy-frontend.sh [branch]
# ============================================================================

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

# --- Logging helpers --------------------------------------------------------
step()  { echo ""; echo "=== STEP: $* ==="; }
info()  { echo "    [INFO]  $*"; }
warn()  { echo "    [WARN]  $*"; }
fail()  { echo "    [ERROR] $*"; exit 1; }

trap 'echo ""; echo "!!! DEPLOY FAILED at line $LINENO (exit code $?) !!!"; echo "!!! Last command: $BASH_COMMAND !!!"' ERR

# ============================================================================
# 1. Resolve Node.js & npm
# ============================================================================
step "Resolving Node.js and npm"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

NODE_BIN="$(command -v node || true)"
[[ -z "$NODE_BIN" ]] && fail "node not found in PATH"
info "Node: $(node -v)"

NPM_NATIVE_OK=false
if command -v npm &>/dev/null; then
  set +e
  npm -v >/dev/null 2>&1
  npm_exit=$?
  set -e
  if [[ "$npm_exit" -eq 0 ]]; then
    NPM_NATIVE_OK=true
    info "npm: $(npm -v)"
  else
    warn "Native npm binary crashed (exit $npm_exit)"
  fi
fi

NPM_CLI_JS=""
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

  if [[ -z "$NPM_CLI_JS" || ! -f "$NPM_CLI_JS" ]]; then
    find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -5 || true
    fail "npm-cli.js not found"
  fi

  set +e
  node "$NPM_CLI_JS" -v >/dev/null 2>&1
  verify_exit=$?
  set -e
  [[ "$verify_exit" -ne 0 ]] && fail "node $NPM_CLI_JS also failed"
  info "npm (via node): $(node "$NPM_CLI_JS" -v)"
fi

npm_cmd() {
  if [[ "$NPM_NATIVE_OK" == "true" ]]; then
    npm "$@"
  else
    node "$NPM_CLI_JS" "$@"
  fi
}

# ============================================================================
# 2. Update source from Git
# ============================================================================
step "Updating source from Git"

[[ ! -d "$REPO_ROOT/.git" ]] && fail "Repo not found at $REPO_ROOT"

cd "$REPO_ROOT"
if [[ -n "$(git status --porcelain)" ]]; then
  info "Stashing local changes"
  git stash push --include-untracked -m "frontend-deploy-auto-stash-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
fi
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
info "HEAD is now $(git rev-parse --short HEAD)"

# ============================================================================
# 3. Install & Build
# ============================================================================
step "Installing dependencies"

cd "$FRONTEND_ROOT"
npm_cmd ci --no-audit --no-fund || npm_cmd install --no-audit --no-fund

step "Building frontend"

npm_cmd run build
info "Build output: $(ls dist/ | head -5) ..."

# ============================================================================
# 4. Deploy to public_html
# ============================================================================
step "Syncing dist to $PUBLIC_ROOT"

find "$PUBLIC_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

cp -R dist/. "$PUBLIC_ROOT/"

echo ""
echo "============================================"
echo "  FRONTEND DEPLOY COMPLETED SUCCESSFULLY"
echo "  Branch: $BRANCH"
echo "  Commit: $(cd "$REPO_ROOT" && git rev-parse --short HEAD)"
echo "  Time:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================"