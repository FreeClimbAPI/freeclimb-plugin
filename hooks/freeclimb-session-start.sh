#!/usr/bin/env bash
set -euo pipefail

marker="$HOME/.cursor/.freeclimb-setup-complete"

if [ -f "$marker" ] || command -v freeclimb >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

cat <<'JSON'
{"additional_context":"FreeClimb plugin: the FreeClimb CLI is not set up on this machine yet, so the FreeClimb MCP tools will not work. Run the /freeclimb-setup command once to install the bundled CLI and authenticate with `freeclimb login` in the terminal. Skills, rules, and commands still work without it."}
JSON
exit 0
