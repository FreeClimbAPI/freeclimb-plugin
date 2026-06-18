# FreeClimb Cursor Plugin

Cursor plugin for building and operating FreeClimb voice and SMS workflows with AI agents. It packages FreeClimb knowledge, guardrails, a first-run setup flow, and a standalone MCP server. The plugin is an internal monorepo with three packages — `@freeclimb/core` (shared HTTP, credentials, validation, errors, PerCL), `freeclimb-cli` (power-user CLI), and `@freeclimb/mcp` (the standalone stdio MCP server). Everything ships and updates through Cursor plugin sync; nothing is published to npm in v1.

## What It Does

This plugin lets an agent turn a business request into a working communications workflow. The core demo flow:

1. Ask Cursor to create a simple FreeClimb support line.
2. The agent uses the plugin skills to design a small IVR.
3. The agent builds a local webhook app that returns PerCL.
4. The FreeClimb CLI runs the local development environment and tunnel.
5. You call the FreeClimb number live.

## Install the plugin

A Cursor team admin adds this plugin from the repository:

1. In Cursor team settings, add a plugin from `https://github.com/FreeClimbAPI/freeclimb-plugin`.
2. Members receive the plugin automatically.

Cursor syncs the repository as-is. The skills, rules, commands, and agent work immediately. The MCP tools require a one-time per-machine setup (below).

## First-run setup

The MCP server is the default surface — no global CLI install required. The first time you use the plugin on a machine, run:

```text
/freeclimb-setup
```

This command (see the `freeclimb-onboarding` skill) will:

1. Build the bundled MCP server once: from the plugin directory, run `npm run setup` (installs dependencies and builds `core/`, `mcp/`, and `cli/`). This produces `mcp/lib/bin.js`, which `.mcp.json` launches via `node mcp/lib/bin.js`.
2. Connect your FreeClimb account via the browser:

   ```bash
   node mcp/lib/bin.js login
   ```

   A local page opens at `127.0.0.1`, deep-links your FreeClimb Dashboard → API Credentials, and lets you paste your Account ID and API Key into that local page. They are written to your OS keyring. Never paste them into chat.
3. Reload Cursor so the MCP server starts.

Power users who want the CLI can additionally `npm i -g ./cli` to put `freeclimb` on their PATH; `freeclimb login` writes the same keyring, so either path authenticates the other.

Requirements: Node.js >= 20 and a working build toolchain (native modules are compiled during install).

## Credentials

- The agent never sees, requests, or writes your Account ID or API Key.
- Credentials live only in the OS keyring, set by the browser login flow (`node mcp/lib/bin.js login`) or by `freeclimb login` if you install the CLI.
- The MCP server and CLI read the keyring automatically. For CI only, `FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY` env vars are supported, but never commit them or paste them into chat.

## Recommended Cursor settings (safe defaults)

FreeClimb MCP tools can spend money and take irreversible actions (place calls, send SMS, buy numbers). The plugin ships its own confirm + destination-allowlist guard, but for defense in depth we strongly recommend new users harden Cursor's agent execution settings under **Cursor Settings → Agents → Approvals & Execution**:

| Setting | Recommended | Why |
| --- | --- | --- |
| **Run Mode** | `Allowlist` (not `Run Everything (Unsandboxed)`) | Commands and MCP tools require approval/allowlisting instead of running unattended. |
| **Browser Protection** | Enabled | Prevents the agent from automatically running browser tools. |
| **MCP Tools Protection** | Enabled | Surfaces every FreeClimb MCP tool call (including billable/destructive ones) for review before it runs. |

![Cursor Approvals & Execution settings](assets/image-8788a919-7fc8-471f-951d-f85884f888c0.png)

These host-level controls complement the plugin's own `beforeMCPExecution` guard, which always asks before `make_call` / `send_sms` / `update_call` / `buy_number` (and `release_number` / `delete_application`). You can additionally set `FREECLIMB_ALLOWED_DESTINATIONS` (comma-separated E.164 numbers) to hard-block outbound calls/SMS to any number not on the allowlist. Together they keep you in control of how much autonomy the agent has on your FreeClimb account.

## Included Components

- Skills for FreeClimb concepts, PerCL call control, phone workflow building, flow verification, debugging, first-run onboarding, and the official SDK catalog.
- A standalone FreeClimb MCP server entry (`command: "node", args: ["mcp/lib/bin.js"]`).
- A `/freeclimb-setup` command for first-run build and browser authentication.
- A `/build-freeclimb-phone-workflow` command for the demo flow.
- A `/freeclimb-test-flow` command to validate PerCL and simulate the webhook path before a live call.
- A rule for safe FreeClimb agent behavior, MCP-first guidance, and credential handling.
- A `freeclimb-builder` agent (mutating) and a read-only `freeclimb-operator` agent for safe inspection.
- Hooks that nudge first-run setup and confirm before billable/irreversible MCP actions.
- Starter templates under `templates/` (Node/Express and Python/Flask) using the official FreeClimb SDKs.

## Repository Layout

- `.cursor-plugin/plugin.json`: Cursor plugin manifest.
- `.mcp.json`: MCP server wiring (`node mcp/lib/bin.js`, stdio).
- `core/`: `@freeclimb/core` — shared HTTP, credentials, validation, errors, and PerCL generate/validate.
- `mcp/`: `@freeclimb/mcp` — the standalone stdio MCP server and browser login bin.
- `cli/`: `freeclimb-cli` — the power-user CLI frontend over `core`.
- `skills/`: Agent guidance for FreeClimb concepts, PerCL, workflow building, verification, debugging, onboarding, and SDKs.
- `commands/`: `/freeclimb-setup`, `/build-freeclimb-phone-workflow`, and `/freeclimb-test-flow`.
- `rules/`: FreeClimb-specific agent rules.
- `agents/`: `freeclimb-builder` (mutating) and `freeclimb-operator` (read-only) subagents.
- `hooks/`: Session setup nudge and a destructive-action MCP guard.
- `templates/`: Node/Express and Python/Flask starter apps using the official SDKs.
- `demo/slides/`: HTML presentation deck and assets.

## Demo Prompt

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

## Developing

The repo is an npm workspace with `core/`, `mcp/`, and `cli/`. From the repo root:

```bash
npm run setup    # install all workspaces + build core, mcp, cli
npm run build    # rebuild all packages (core -> mcp -> cli)
npm test         # run the CLI test suite
npm run validate # validate the Cursor plugin manifest/components
```

To work on the CLI directly:

```bash
cd cli
npm run prepack   # build lib/ and the oclif manifest
```
