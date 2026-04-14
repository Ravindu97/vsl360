#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# --- npm wrapper: bypass broken npm binary by invoking via node directly ---
NPM_CLI_JS="/opt/alt/alt-nodejs20/root/usr/lib/node_modules/npm/bin/npm-cli.js"

# Detect once whether the native npm binary works
NPM_NATIVE_OK=false
if command -v npm &>/dev/null && npm -v &>/dev/null; then
  NPM_NATIVE_OK=true
fi

npm_cmd() {
  if [[ "$NPM_NATIVE_OK" == "true" ]]; then
    npm "$@"
  elif [[ -f "$NPM_CLI_JS" ]]; then
    node "$NPM_CLI_JS" "$@"
  else
    echo "ERROR: npm is broken and npm-cli.js not found at $NPM_CLI_JS"
    return 1
  fi
}

echo "==> Using Node: $(node -v)"
NPM_VERSION="$(npm_cmd -v 2>/dev/null || true)"
if [[ -z "$NPM_VERSION" ]]; then
  echo "==> Using npm: unavailable"
else
  echo "==> Using npm: $NPM_VERSION"
fi

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "ERROR: Repo not found at $REPO_ROOT"
  exit 1
fi

cd "$REPO_ROOT"
echo "==> Fetching branch: $BRANCH"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "==> Repository has local changes; stashing before deploy"
  git stash push --include-untracked -m "frontend-deploy-auto-stash-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
fi
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

cd "$FRONTEND_ROOT"

echo "==> Installing dependencies"
npm_cmd install

echo "==> Building frontend"
npm_cmd run build

echo "==> Syncing dist to public_html"
find "$PUBLIC_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

cp -R dist/. "$PUBLIC_ROOT/"

echo "==> Frontend deploy completed successfully"