# FreeClimb Cursor Plugin

Cursor plugin for building and operating FreeClimb voice and SMS workflows with AI agents. It packages FreeClimb knowledge, guardrails, a first-run setup flow, and a standalone MCP server. The plugin is an internal monorepo with three packages — `@freeclimb/core` (shared HTTP, credentials, validation, errors, PerCL), `freeclimb-cli` (power-user CLI), and `@freeclimb/mcp` (the standalone stdio MCP server). Everything ships and updates through Cursor plugin sync; nothing is published to npm in v1.

## What It Does

This plugin lets an agent turn a business request into a working communications workflow or a privacy-safe operations dashboard. The core workflow demo:

1. Ask Cursor to create a simple FreeClimb support line.
2. The agent uses the plugin skills to design a small IVR.
3. The agent builds a local webhook app that returns PerCL.
4. The FreeClimb CLI runs the local development environment and tunnel.
5. You call the FreeClimb number live.

For operations and demos, ask Cursor to create a FreeClimb dashboard. The `render-freeclimb-dashboard` skill composes a constrained declarative specification, reads account data through MCP, and renders a point-in-time HTML dashboard inline. Ask it to refresh to capture a new snapshot.

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

1. Build the bundled MCP server once: from the plugin directory, run `pnpm run setup` (installs dependencies and builds `core/`, `mcp/`, and `cli/`). This produces `mcp/lib/bin.js`, which `.mcp.json` launches via `node ${CURSOR_PLUGIN_ROOT}/mcp/lib/bin.js`.
2. Connect your FreeClimb account via the browser:

   ```bash
   node mcp/lib/bin.js login
   ```

   A local page opens at `127.0.0.1`, deep-links your FreeClimb Dashboard → API Credentials, and lets you paste your Account ID and API Key into that local page. They are written to your OS keyring. Never paste them into chat.
3. Reload Cursor so the MCP server starts.

Power users who want the CLI can additionally `pnpm i -g ./cli` to put `freeclimb` on their PATH; `freeclimb login` writes the same keyring, so either path authenticates the other.

Requirements: Node.js >= 20 and a working build toolchain (native modules are compiled during install).

## Credentials

- The agent never sees, requests, or writes your Account ID or API Key.
- Credentials live only in the OS keyring, set by the browser login flow (`node mcp/lib/bin.js login`) or by `freeclimb login` if you install the CLI.
- The MCP server and CLI read the keyring automatically. For CI only, `FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY` env vars are supported, but never commit them or paste them into chat.

## Read-only MCP, CLI for actions

The FreeClimb MCP tools are **read-only**: they inspect the account (calls, SMS, numbers, applications, logs) and generate/validate PerCL locally, but they cannot spend money or change the account. Every billable or irreversible action (place calls, send SMS, buy numbers, update calls/applications) is performed through the **FreeClimb CLI**, which the agent runs as a terminal command with `--dry-run` and input validation.

This consolidates all account-changing operations onto a single surface that Cursor's command-execution approvals govern. We strongly recommend hardening these settings under **Cursor Settings → Agents → Approvals & Execution**:

| Setting | Recommended | Why |
| --- | --- | --- |
| **Run Mode** | `Allowlist` (not `Run Everything (Unsandboxed)`) | The agent's `freeclimb` action commands require approval/allowlisting instead of running unattended — this is the primary control for billable actions. |
| **Browser Protection** | Enabled | Prevents the agent from automatically running browser tools. |
| **MCP Tools Protection** | Enabled | Surfaces FreeClimb MCP tool calls for review (defense in depth; these are read-only). |

![Cursor Approvals & Execution settings](assets/image-8788a919-7fc8-471f-951d-f85884f888c0.png)

Because the MCP surface can no longer mutate the account, prompt-injection that reaches the agent cannot place calls or send SMS through MCP; it would have to issue a CLI command, which the approval/allowlist Run Mode gates. In addition, the plugin's `beforeShellExecution` hook downgrades billable FreeClimb CLI commands without `--dry-run` from auto-run to an explicit approval prompt. Always `--dry-run` and confirm intent before running an action command.

## Included Components

- Skills for FreeClimb concepts, PerCL call control, phone workflow building, privacy-safe dashboard rendering, flow verification, debugging, first-run onboarding, the official SDK catalog, SMS compliance, webhook security, incident triage, conferences/queues/recordings, MMS messaging, voice input and transcription, TTS, WebRTC calling, and blob-store state.
- A standalone FreeClimb MCP server entry (`command: "node", args: ["${CURSOR_PLUGIN_ROOT}/mcp/lib/bin.js"]`).
- A `/freeclimb-setup` command for first-run build and browser authentication.
- A `/build-freeclimb-phone-workflow` command for the demo flow.
- A `/freeclimb-test-flow` command to validate PerCL and simulate the webhook path before a live call.
- A `/freeclimb-status` command for a one-shot read-only account health check across calls, SMS, logs, and webhook configuration.
- An always-applied rule (`rules/freeclimb.mdc`) that is the canonical guardrail source: credential handling, read-only MCP vs CLI-for-actions, dry-run/confirmation, and trial-account limits. Agents and commands reference it instead of restating it.
- A contextual SMS compliance rule (`rules/sms-compliance.mdc`) for opt-out handling, consent, quiet hours, and 10DLC guardrails when composing or sending SMS.
- A `freeclimb-builder` agent (reads via MCP, acts via the CLI) and a read-only `freeclimb-operator` agent for safe inspection.
- Three hooks: a first-run setup nudge (`sessionStart`), a `beforeShellExecution` guard that requires approval for billable FreeClimb CLI commands issued without `--dry-run`, and an `afterFileEdit` PerCL guard that validates `.percl.json` files on save using the core PerCL validator.
- Starter templates under `templates/` (Node/Express and Python/Flask) using the official FreeClimb SDKs.

## Repository Layout

- `.cursor-plugin/plugin.json`: Cursor plugin manifest.
- `.mcp.json`: MCP server wiring (`node ${CURSOR_PLUGIN_ROOT}/mcp/lib/bin.js`, stdio).
- `core/`: `@freeclimb/core` — shared HTTP, credentials, validation, errors, and PerCL generate/validate.
- `mcp/`: `@freeclimb/mcp` — the standalone stdio MCP server and browser login bin.
- `cli/`: `freeclimb-cli` — the power-user CLI frontend over `core`.
- `skills/`: Agent guidance for FreeClimb concepts, PerCL, workflow building, dashboard rendering, verification, debugging, onboarding, SDKs, SMS compliance, webhook security, incident triage, conferences/queues/recordings, MMS messaging, voice input and transcription, TTS, WebRTC calling, and blob-store state.
- `commands/`: `/freeclimb-setup`, `/build-freeclimb-phone-workflow`, `/freeclimb-test-flow`, and `/freeclimb-status`.
- `rules/`: FreeClimb guardrails (`freeclimb.mdc`) and SMS compliance (`sms-compliance.mdc`).
- `agents/`: `freeclimb-builder` (reads via MCP, acts via CLI) and `freeclimb-operator` (read-only) subagents.
- `hooks/`: Session setup nudge, the billable-CLI dry-run guard, and the PerCL validation guard on `.percl.json` edits.
- `templates/`: Node/Express and Python/Flask starter apps using the official SDKs.
- `demo/slides/`: HTML presentation deck and assets.

## Demo Prompt

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

Dashboard demo:

```text
Create a privacy-safe FreeClimb operations dashboard focused on account health, active calls, recent-call count, and recent-error count. Render it in the IDE without displaying identifiers, phone numbers, message bodies, or log text. After I place one inbound call, refresh the snapshot and summarize the aggregate change.
```

## Developing

The repo is a pnpm workspace with `core/`, `mcp/`, and `cli/`. From the repo root (enable pnpm once with `corepack enable && corepack prepare --activate`):

```bash
pnpm run setup    # install all workspaces + build core, mcp, cli
pnpm run build    # rebuild all packages (core -> mcp -> cli)
pnpm test         # run the core, mcp, and cli test suites
pnpm run validate # validate the plugin manifest/frontmatter and scan for secrets
```

To work on the CLI directly:

```bash
cd cli
pnpm run prepack   # build lib/ and the oclif manifest
```
