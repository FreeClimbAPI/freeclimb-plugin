#!/usr/bin/env bash
set -euo pipefail
echo "=== FreeClimb CLI Setup ==="
echo "[1/4] Installing dependencies..."
npm install --ignore-scripts
echo "[2/4] Building CLI..."
npm run prepack
echo "[3/4] Checking credentials..."
if [ -n "${FREECLIMB_ACCOUNT_ID:-}" ] && [ -n "${FREECLIMB_API_KEY:-}" ]; then
    echo "  ✓ Credentials found in environment."
else
    echo "  ⚠ Set FREECLIMB_ACCOUNT_ID and FREECLIMB_API_KEY to enable API access."
fi
echo "[4/4] Verifying CLI..."
node bin/run --version
echo ""
echo "Setup complete. MCP server auto-discovered by Claude Code, Cursor, and VS Code."
