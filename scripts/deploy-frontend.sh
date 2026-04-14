#!/usr/bin/env bash
# ==========================================================================
# VSL360 Frontend Deploy Script
# Usage: bash deploy-frontend.sh [branch]
# ==========================================================================

set -e

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

# --------------------------------------------------------------------------
# 1. Setup Node.js and npm
# --------------------------------------------------------------------------
echo ""
echo "===== 1. SETUP NODE & NPM ====="

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  echo "FATAL: node not found in PATH"
  exit 1
fi
echo "Node: $NODE_BIN ($(node -v))"

# Always use node to invoke npm-cli.js directly.
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
  NPM_CLI="$(find /opt/alt -name 'npm-cli.js' -type f 2>/dev/null | head -1)"
fi

if [ -z "$NPM_CLI" ] || [ ! -f "$NPM_CLI" ]; then
  echo "FATAL: Cannot find npm-cli.js"
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
git stash push --include-untracked -m "frontend-deploy-$(date +%s)" 2>/dev/null || true
git fetch origin
git checkout "$BRANCH" 2>/dev/null || true
git pull origin "$BRANCH"
echo "HEAD: $(git rev-parse --short HEAD)"

# --------------------------------------------------------------------------
# 3. Install & Build
# --------------------------------------------------------------------------
echo ""
echo "===== 3. INSTALL DEPENDENCIES ====="

cd "$FRONTEND_ROOT"

echo "Running: npm ci"
if node "$NPM_CLI" ci --no-audit --no-fund 2>&1; then
  echo "npm ci succeeded"
else
  echo "npm ci failed, trying npm install..."
  node "$NPM_CLI" install --no-audit --no-fund 2>&1
fi

echo ""
echo "===== 4. BUILD ====="

node "$NPM_CLI" run build 2>&1
echo "Build output:"
ls dist/ | head -10

# --------------------------------------------------------------------------
# 4. Deploy to public_html
# --------------------------------------------------------------------------
echo ""
echo "===== 5. DEPLOY TO PUBLIC_HTML ====="

find "$PUBLIC_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

cp -R dist/. "$PUBLIC_ROOT/"

echo ""
echo "========================================"
echo "  FRONTEND DEPLOY COMPLETE"
echo "  Branch: $BRANCH"
echo "  Commit: $(cd "$REPO_ROOT" && git rev-parse --short HEAD)"
echo "  Time:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
