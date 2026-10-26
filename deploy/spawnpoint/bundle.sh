#!/bin/bash
# Stages a clean deploy bundle for Spawnpoint in $1 (default ./.spawnpoint-bundle):
# source without secrets, git, dependencies or local data, plus cached event snapshots as seeds,
# with deploy/spawnpoint/Dockerfile as the bundle's root Dockerfile.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="${1:-.spawnpoint-bundle}"
rm -rf "$OUT" && mkdir -p "$OUT/seed-snapshots"
rsync -a \
  --exclude .git --exclude .venv --exclude node_modules --exclude .next \
  --exclude '.env' --exclude '.env.*' --exclude 'backend/data' --exclude __pycache__ \
  --exclude .pytest_cache --exclude .ruff_cache --exclude "$OUT" --exclude KAIROS_PROJECT_CONTEXT.md \
  ./ "$OUT/"
cp deploy/spawnpoint/Dockerfile "$OUT/Dockerfile"
# The Clerk publishable key is public (every browser receives it) and is compiled into the frontend at
# build time, so ship that one line. The secret key is never bundled: it is set as Spawnpoint env.
# (A plain file, not .env.*: Spawnpoint drops .env files from uploaded bundles.)
sed -n 's/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=//p' frontend/.env.local 2>/dev/null | tr -d '"' | head -1 > "$OUT/frontend/clerk-publishable-key"
[ -s "$OUT/frontend/clerk-publishable-key" ] \
  || echo "warning: frontend/.env.local has no NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; sign-in will not work" >&2
cp backend/data/snapshots/*.json "$OUT/seed-snapshots/" 2>/dev/null || true
echo "Bundle ready in $OUT ($(du -sh "$OUT" | cut -f1))"
