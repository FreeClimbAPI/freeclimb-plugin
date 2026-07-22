---
name: manage-freeclimb-account
description: Manage FreeClimb authentication safely. Use when the user wants to view, connect, switch, log out, or troubleshoot the account used by the FreeClimb plugin.
---

# Manage FreeClimb Account

Follow `rules/freeclimb.mdc`. Never request, display, or write an Account ID or API key in chat.

## Locate the plugin

Find the active plugin root containing `.cursor-plugin/plugin.json` with `"name": "freeclimb"`, plus `mcp/`, `core/`, and `.mcp.json`.

## Show the connected account

Call the FreeClimb `get_account` MCP tool. Summarize the alias, type, and status without displaying the Account ID.

If it returns 401, explain that the Account ID and API key may not match or may belong to a different API environment.

## Connect or switch accounts

From the plugin root, run:

```bash
node mcp/lib/bin.js login
```

The local browser page collects and validates the credentials before replacing the current Keychain entries. For staging or another custom environment, `FREECLIMB_CLI_BASE_URL` must be available to both the login process and Cursor's MCP process.

After login succeeds, call `get_account` and summarize the connected account without displaying its Account ID.

## Log out

From the plugin root, run:

```bash
node mcp/lib/bin.js logout
```

This removes the FreeClimb Keychain entries and setup marker. If the command reports credential environment variables, explain that they remain available as fallback credentials and must be removed from the user's environment separately.

Do not delete Keychain entries or setup markers with ad hoc shell commands.

## Recovery

If the MCP tool does not reflect a successful switch, use **Developer: Reload Window** and retry `get_account`.

If login returns 401, confirm locally that the credentials are a matching pair for the configured API environment, then rerun login. Do not ask the user to paste either value into chat.
