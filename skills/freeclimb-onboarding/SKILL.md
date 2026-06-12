---
name: freeclimb-onboarding
description: First-run setup for the FreeClimb plugin - install the bundled CLI and authenticate in the terminal so the MCP server works. Use when FreeClimb MCP tools are unavailable or the user runs /freeclimb-setup.
---

# FreeClimb First-Run Setup

Goal: get the `freeclimb` CLI installed on the user's machine and authenticated, so the plugin's MCP server (configured as `command: "freeclimb"`) starts and the agent can navigate FreeClimb without ever handling raw credentials.

Never ask the user to paste an Account ID or API Key into chat. Authentication happens only in the user's own terminal via `freeclimb login`.

## Step 1 - Check existing setup

```bash
command -v freeclimb && freeclimb diagnose
```

- If `freeclimb` is on PATH and `freeclimb diagnose` reports it is authenticated, setup is already complete. Write the marker (Step 5) and stop.
- Otherwise continue.

## Step 2 - Locate the bundled CLI

The CLI source ships inside this plugin at `<plugin-root>/cli`. Determine `<plugin-root>` from the absolute path of this skill file: the plugin root is two directories above this file (`.../<plugin-root>/skills/freeclimb-onboarding/SKILL.md`).

If that path is not obvious, find it:

```bash
ls -d ~/.cursor/plugins/*/freeclimb/cli ~/.cursor/plugins/**/freeclimb/cli ~/.cursor/plugins/local/freeclimb/cli 2>/dev/null | head -1
```

Use the first existing `cli/` directory whose `package.json` has `"name": "freeclimb-cli"`.

## Step 3 - Build and install (terminal, user-approved)

From the located `cli/` directory:

```bash
cd <plugin-root>/cli
npm install
npm i -g .
```

- `npm install` pulls dependencies, including native modules. It needs Node >= 20 and a working build toolchain.
- `npm i -g .` builds the package (via its prepack step) and links `freeclimb` onto PATH.
- If global install fails with EACCES or permission errors, set a user-writable npm prefix, ensure it is on PATH, then retry:

```bash
mkdir -p "$HOME/.npm-global" && npm config set prefix "$HOME/.npm-global"
# add "$HOME/.npm-global/bin" to PATH in the user's shell profile, then reopen the shell
npm i -g .
```

Verify:

```bash
freeclimb --version
```

## Step 4 - Authenticate (user types credentials in their own terminal)

Ask the user to run this in their terminal and enter their Account ID and API Key when prompted:

```bash
freeclimb login
```

Do not run a non-interactive login with credentials supplied in chat. Do not echo, store, or write the Account ID or API Key anywhere. The CLI stores them in the OS keyring.

Verify:

```bash
freeclimb diagnose
```

## Step 5 - Mark complete and reload

Write a success marker so the plugin stops nudging for setup:

```bash
mkdir -p "$HOME/.cursor" && touch "$HOME/.cursor/.freeclimb-setup-complete"
```

Then tell the user to reload Cursor (Developer: Reload Window) so the FreeClimb MCP server starts with `freeclimb` now on PATH.

## Re-running

This setup is safe to run again. Re-run it after the plugin updates so the globally linked CLI is rebuilt from the latest bundled source.

## Notes

- This installs from the bundled `cli/` source, so no npm publish is required. If `freeclimb-cli` is later published to npm, this step can be replaced with `npm i -g freeclimb-cli`.
