# FreeClimb Cursor Plugin

Cursor plugin for building and operating FreeClimb voice and SMS workflows with AI agents. It packages FreeClimb knowledge, guardrails, a first-run setup flow, and an MCP server backed by the FreeClimb CLI that ships in this repo.

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

The MCP server runs the `freeclimb` CLI, which is bundled in this repo under [`cli/`](cli/). The first time you use the plugin on a machine, run:

```text
/freeclimb-setup
```

This command (see the `freeclimb-onboarding` skill) will:

1. Detect whether `freeclimb` is already installed and authenticated.
2. Build and globally install the bundled CLI from `cli/` (`npm install` then `npm i -g .`), putting `freeclimb` on your PATH.
3. Ask you to authenticate in your own terminal:

   ```bash
   freeclimb login
   ```

   Enter your Account ID and API Key when prompted. Credentials are stored in your OS keyring. Never paste them into chat.
4. Verify with `freeclimb diagnose` and ask you to reload Cursor so the MCP server starts.

Requirements: Node.js >= 20 and a working build toolchain (native modules are compiled during install).

## Credentials

- The agent never sees, requests, or writes your Account ID or API Key.
- Credentials live only in the FreeClimb CLI's OS keyring, set by `freeclimb login` in your terminal.
- The MCP server and CLI read the keyring automatically. For CI only, `FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY` env vars are supported, but never commit them or paste them into chat.

## Included Components

- Skills for FreeClimb concepts, PerCL call control, phone workflow building, debugging, and first-run onboarding.
- A FreeClimb MCP server entry (`command: "freeclimb", args: ["mcp:start"]`).
- A `/freeclimb-setup` command for first-run install and authentication.
- A `/build-freeclimb-phone-workflow` command for the demo flow.
- A rule for safe FreeClimb agent behavior and credential handling.
- A `freeclimb-builder` agent for business-request-to-phone-workflow tasks.
- Hooks that detect missing setup and guide the user to `/freeclimb-setup`.

## Repository Layout

- `.cursor-plugin/plugin.json`: Cursor plugin manifest.
- `.mcp.json`: MCP server wiring for the FreeClimb CLI.
- `skills/`: Agent guidance for FreeClimb concepts, PerCL, workflow building, debugging, and onboarding.
- `commands/`: `/freeclimb-setup` and `/build-freeclimb-phone-workflow`.
- `rules/`: FreeClimb-specific agent rules.
- `agents/`: FreeClimb builder subagent definition.
- `hooks/`: Session and MCP hooks for first-run detection.
- `cli/`: The FreeClimb CLI source (canonical home), built and linked by `/freeclimb-setup`.
- `demo/slides/`: HTML presentation deck and assets.

## Demo Prompt

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

## Developing the CLI

The CLI lives in [`cli/`](cli/) and is the canonical source. To work on it directly:

```bash
cd cli
npm install
npm run prepack   # build lib/ and the oclif manifest
npm test
```

`npm run setup` at the repo root runs the equivalent install + build for the bundled CLI.
