#!/usr/bin/env bash
set -euo pipefail

plugin_root="${CURSOR_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
marker="$HOME/.cursor/.freeclimb-setup-complete"

if [ ! -f "$plugin_root/mcp/lib/bin.js" ]; then
  cat <<'JSON'
{"additional_context":"FreeClimb plugin: the standalone MCP server is not built yet, so the FreeClimb MCP tools will not work. Run the /freeclimb-setup command once (it runs `pnpm run setup` in the plugin directory to install dependencies and build core/mcp/cli). Skills, rules, and commands still work without it."}
JSON
  exit 0
fi

if [ -f "$marker" ] || { [ -n "${FREECLIMB_ACCOUNT_ID:-}" ] && [ -n "${FREECLIMB_API_KEY:-}" ]; }; then
  echo '{}'
  exit 0
fi

cat <<'JSON'
{"additional_context":"FreeClimb plugin: the MCP server is built but no account is connected yet. Run the /freeclimb-setup command (or `node mcp/lib/bin.js login` from the plugin directory) to connect your FreeClimb account via the local browser flow. Credentials are stored in the OS keyring; never paste them into chat."}
JSON
exit 0
