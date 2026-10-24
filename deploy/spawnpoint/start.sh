#!/bin/bash
# Starts FalkorDB, the API and the web app; exits (so the supervisor restarts the container) if any stops.
set -euo pipefail

DATA="${SPAWNPOINT_DATA_DIR:-/data}"
mkdir -p "$DATA/falkordb" "$DATA/snapshots" "$DATA/logs"
# Ship known event pages so the first load of the demo events is instant; never overwrite fresher ones.
cp -n /app/seed-snapshots/*.json "$DATA/snapshots/" 2>/dev/null || true

redis-server --loadmodule /var/lib/falkordb/bin/falkordb.so \
  --bind 127.0.0.1 --port 6379 --dir "$DATA/falkordb" --appendonly yes &
until redis-cli -p 6379 ping >/dev/null 2>&1; do sleep 0.2; done

export KAIROS_STORAGE=falkordb
export KAIROS_FALKORDB_URL=redis://127.0.0.1:6379
export KAIROS_SNAPSHOT_DIR="$DATA/snapshots"
export KAIROS_LOG_FILE="$DATA/logs/kairos.log"

(cd /app && .venv/bin/uvicorn kairos.app:app --app-dir backend --host 127.0.0.1 --port 8000) &
until curl -fs http://127.0.0.1:8000/health >/dev/null 2>&1 || python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" 2>/dev/null; do sleep 0.3; done

(cd /app/frontend && node node_modules/next/dist/bin/next start -p "${PORT:-8080}" -H 0.0.0.0) &

wait -n
exit 1
