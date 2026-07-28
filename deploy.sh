#!/usr/bin/env bash
set -euo pipefail

KEY="${KEY:-$HOME/Downloads/llave_regalitos.pem}"
IP="${IP:-18.226.186.60}"
REMOTE_DIR="/home/ubuntu/tienda-barrio"
ROOT="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_URL="${PUBLIC_URL:-https://18.226.186.60.sslip.io}"

chmod 400 "$KEY" 2>/dev/null || true

echo "→ Build local..."
cd "$ROOT"
npm run build

echo "→ Subiendo a $IP..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .next/cache \
  --exclude .next/dev \
  --exclude data/store.json \
  --exclude data/store.db \
  --exclude data/store.db-* \
  --exclude data/backups \
  --exclude certificates \
  --exclude .env \
  --exclude .env.local \
  -e "ssh -i $KEY -o StrictHostKeyChecking=yes" \
  "$ROOT/" "ubuntu@$IP:$REMOTE_DIR/"

echo "→ Reiniciando en servidor..."
ssh -i "$KEY" -o StrictHostKeyChecking=yes "ubuntu@$IP" "set -e
  cd $REMOTE_DIR
  if [ ! -f .env ]; then
    SECRET=\$(openssl rand -hex 32)
    printf 'SESSION_SECRET=%s\nNODE_ENV=production\nPORT=3000\n' \"\$SECRET\" > .env
    echo 'Creado .env con SESSION_SECRET nuevo'
  fi
  mkdir -p data/backups
  if [ -f data/store.json ]; then
    stamp=\$(date -u +%Y%m%dT%H%M%SZ)
    cp data/store.json \"data/backups/store-pre-deploy-\$stamp.json\" || true
  fi
  if [ -f data/store.db ]; then
    stamp=\$(date -u +%Y%m%dT%H%M%SZ)
    cp data/store.db \"data/backups/store-pre-deploy-\$stamp.db\" || true
  fi
  npm ci --omit=dev
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  export SESSION_SECRET NODE_ENV PORT
  pm2 restart tienda-barrio --update-env || pm2 start ecosystem.config.cjs --update-env
  pm2 save
  curl -sI http://127.0.0.1:3000/login | head -5
  curl -sI http://127.0.0.1/login | head -3 || true
"

echo "✓ Desplegado: $PUBLIC_URL"
