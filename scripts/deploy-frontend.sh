#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

# --- npm wrapper: bypass broken npm binary by invoking via node directly ---
NPM_NATIVE_OK=false
if command -v npm &>/dev/null && npm -v >/dev/null 2>&1; then
  NPM_NATIVE_OK=true
fi

NPM_CLI_JS=""
if [[ "$NPM_NATIVE_OK" == "false" ]]; then
  NODE_BIN="$(command -v node)"
  NODE_PREFIX="$(dirname "$(dirname "$NODE_BIN")")"

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

  echo "==> npm binary is broken; using node-direct mode"
  echo "    NPM_CLI_JS=$NPM_CLI_JS"

  if [[ -z "$NPM_CLI_JS" ]]; then
    echo "ERROR: Could not find npm-cli.js anywhere."
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

echo "==> Using Node: $(node -v)"
echo "==> Using npm:  $(npm_cmd -v)"

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