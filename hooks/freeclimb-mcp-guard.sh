#!/usr/bin/env bash
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input=$(cat)

if command -v node >/dev/null 2>&1; then
  printf '%s' "$input" | node "$dir/freeclimb-destructive-guard.mjs" 2>/dev/null || echo '{"permission":"allow"}'
else
  echo '{"permission":"allow"}'
fi
