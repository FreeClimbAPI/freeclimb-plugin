#!/usr/bin/env bash
set -euo pipefail

input=$(cat)

case "$input" in
  *freeclimb*) ;;
  *)
    echo '{"permission":"allow"}'
    exit 0
    ;;
esac

if command -v freeclimb >/dev/null 2>&1; then
  echo '{"permission":"allow"}'
  exit 0
fi

cat <<'JSON'
{"permission":"ask","user_message":"FreeClimb CLI not found on PATH. Run /freeclimb-setup once to install it and authenticate with `freeclimb login`.","agent_message":"The FreeClimb MCP server needs the freeclimb CLI on PATH. Ask the user to run /freeclimb-setup, which installs the bundled CLI and guides `freeclimb login`."}
JSON
exit 0
