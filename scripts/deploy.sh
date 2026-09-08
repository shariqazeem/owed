#!/usr/bin/env bash
# Ship Owed to the VM: sync the source (never node_modules, .env or the database), build there under
# Node 22, then start or reload the pm2 apps from ecosystem.config.cjs.
set -euo pipefail
KEY=${OWED_SSH_KEY:-$HOME/Documents/ssh-key3.key}
HOST=${OWED_HOST:-ubuntu@80.225.209.190}
cd "$(dirname "$0")/.."
rsync -az -e "ssh -i $KEY -o StrictHostKeyChecking=no" --exclude node_modules --exclude .next --exclude var --exclude .env --exclude .git --exclude tsconfig.tsbuildinfo ./ "$HOST:/home/ubuntu/owed/"
ssh -o StrictHostKeyChecking=no -i "$KEY" "$HOST" bash -s <<'REMOTE'
set -e
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null
cd /home/ubuntu/owed
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -1
fi
npm run build 2>&1 | tail -5
pm2 startOrReload ecosystem.config.cjs --update-env >/dev/null
sleep 2; pm2 ls | grep -E "owed"
curl -s -o /dev/null -w "local :3100 → %{http_code}\n" http://127.0.0.1:3100/
REMOTE
