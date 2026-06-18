---
name: freeclimb-onboarding
description: First-run setup for the FreeClimb plugin - build the standalone MCP server once and connect the account via the local browser login flow. Use when FreeClimb MCP tools are unavailable or the user runs /freeclimb-setup.
---

# FreeClimb First-Run Setup

Goal: get the standalone FreeClimb MCP server built and the account connected, so the plugin's MCP tools work. The MCP server is the default surface; installing the CLI is an optional power-user step.

Never ask the user to paste an Account ID or API Key into chat. Authentication happens in a local browser page that writes credentials to the OS keyring.

## Step 1 - Locate the plugin directory

The plugin ships as an npm workspace. Find its root (the directory that contains `mcp/`, `core/`, `cli/`, and `.mcp.json`):

```bash
ls -d ~/.cursor/plugins/local/freeclimb ~/.cursor/plugins/*/freeclimb 2>/dev/null | head -1
```

Use the first directory whose `.cursor-plugin/plugin.json` has `"name": "freeclimb"`. Call this `<plugin-root>`.

## Step 2 - Build the MCP server once (terminal, user-approved)

From `<plugin-root>`:

```bash
npm run setup
```

This runs `npm install` and builds `core/`, `mcp/`, and `cli/`. It produces `<plugin-root>/mcp/lib/bin.js`, which `.mcp.json` launches via `node mcp/lib/bin.js`. It needs Node >= 20 and a working build toolchain (native modules compile during install).

Verify the build:

```bash
node mcp/lib/bin.js --help
```

## Step 3 - Connect the account (local browser flow)

From `<plugin-root>`:

```bash
node mcp/lib/bin.js login
```

This opens a local page on `127.0.0.1` that deep-links the FreeClimb Dashboard → API Credentials. The user pastes their Account ID and API Key into that local page. The credentials are written to the OS keyring and a setup marker is recorded. Nothing is sent to chat.

Do not run a non-interactive login with credentials supplied in chat. Do not echo, store, or write the Account ID or API Key anywhere.

## Step 4 - Reload

Tell the user to reload Cursor (Developer: Reload Window) so the FreeClimb MCP server starts.

## Step 5 - Recommend safe execution settings

Because FreeClimb MCP tools can spend money and take irreversible actions, advise the user to harden Cursor's agent execution settings under **Cursor Settings → Agents → Approvals & Execution**:

- Run Mode: `Allowlist` (not `Run Everything (Unsandboxed)`).
- Browser Protection: enabled.
- MCP Tools Protection: enabled.

These complement the plugin's built-in confirm/allowlist guard so billable or destructive tool calls surface for review instead of running unattended. See the "Recommended Cursor settings" section of the plugin README for details.

## Optional - Install the CLI (power users)

Users who want the `freeclimb` CLI on PATH can also run, from `<plugin-root>`:

```bash
npm i -g ./cli
freeclimb login
```

`freeclimb login` writes the same keyring, so either path authenticates the other.

## Re-running

This setup is safe to run again. Re-run `npm run setup` after the plugin updates so the MCP server is rebuilt from the latest synced source. Updates flow through the Cursor plugin sync setting; there is no npm publish in v1.
