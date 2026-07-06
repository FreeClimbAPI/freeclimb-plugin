---
name: freeclimb-setup
description: First-time setup - build the standalone FreeClimb MCP server and connect your account via the browser so the MCP tools work.
---

# /freeclimb-setup

Run the FreeClimb first-time setup. Load and follow the `freeclimb-onboarding` skill, which:

1. Locates the plugin directory (the workspace containing `mcp/`, `core/`, `cli/`, and `.mcp.json`).
2. Builds the standalone MCP server once with `pnpm run setup` (install + build), producing `mcp/lib/bin.js`.
3. Connects the account via the local browser login flow (`node mcp/lib/bin.js login`). Credentials are entered in a local browser page and stored in the OS keyring, never in chat.
4. Tells the user to reload Cursor so the FreeClimb MCP server starts.
5. Optionally installs the `freeclimb` CLI for power users (`pnpm i -g ./cli`).

Never request, display, or write the user's Account ID or API Key. Authentication happens only in the local browser page.
