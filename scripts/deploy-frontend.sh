#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-make-ready-for-depployment}"

REPO_ROOT="/home/adminvisitsrilan/repositories/vsl360"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PUBLIC_ROOT="/home/adminvisitsrilan/public_html"

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

cd "$FRONTEND_ROOT"

echo "==> Installing dependencies"
npm install

echo "==> Building frontend"
npm run build

echo "==> Syncing dist to public_html"
find "$PUBLIC_ROOT" -mindepth 1 -maxdepth 1 \
  ! -name '.well-known' \
  ! -name '.htaccess' \
  -exec rm -rf {} +

cp -R dist/. "$PUBLIC_ROOT/"

echo "==> Frontend deploy completed successfully"