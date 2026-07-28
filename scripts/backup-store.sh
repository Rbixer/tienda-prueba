#!/usr/bin/env bash
# Copia manual de respaldo del almacén (JSON espejo y/o SQLite)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="$ROOT/data/backups"
mkdir -p "$DEST_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
copied=0
if [[ -f "$ROOT/data/store.json" ]]; then
  cp "$ROOT/data/store.json" "$DEST_DIR/store-manual-$stamp.json"
  echo "Backup JSON: $DEST_DIR/store-manual-$stamp.json"
  copied=1
fi
if [[ -f "$ROOT/data/store.db" ]]; then
  cp "$ROOT/data/store.db" "$DEST_DIR/store-manual-$stamp.db"
  # WAL companions if present
  [[ -f "$ROOT/data/store.db-wal" ]] && cp "$ROOT/data/store.db-wal" "$DEST_DIR/store-manual-$stamp.db-wal" || true
  [[ -f "$ROOT/data/store.db-shm" ]] && cp "$ROOT/data/store.db-shm" "$DEST_DIR/store-manual-$stamp.db-shm" || true
  echo "Backup DB: $DEST_DIR/store-manual-$stamp.db"
  copied=1
fi
if [[ "$copied" -eq 0 ]]; then
  echo "No hay data/store.json ni data/store.db"
  exit 1
fi
ls -1t "$DEST_DIR"/store-*.json 2>/dev/null | tail -n +41 | xargs -r rm -f || true
ls -1t "$DEST_DIR"/store-*.db 2>/dev/null | tail -n +21 | xargs -r rm -f || true
