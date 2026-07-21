# Context Glossary

Domain language for the FreeClimb Cursor plugin monorepo. This is a glossary, not a spec. Implementation decisions live in `docs/adr/`. The bundled CLI has its own glossary at [`cli/CONTEXT.md`](cli/CONTEXT.md).

## Plugin

The Cursor plugin defined by `.cursor-plugin/plugin.json`. Ships skills, rules, commands, an agent, hooks, and an MCP server entry. Distributed by a Cursor team admin adding the repository in team settings.

## CLI

The optional FreeClimb command-line tool whose source lives in `cli/`. Provides FreeClimb provisioning, local dev tunneling, diagnostics, authentication, and all billable/account-changing actions. This monorepo is its canonical home.

## MCP server

The standalone read-only Model Context Protocol server launched by the plugin with `node mcp/lib/bin.js`. Exposes FreeClimb inspection tools and local PerCL/dashboard helpers to the agent without putting raw credentials in chat or MCP config.

## Onboarding / Setup

The one-time, per-machine flow that builds the private workspaces and authenticates the MCP server. Driven by the `/freeclimb-setup` command and `freeclimb-onboarding` skill.

## REST resources

The `core/src/resources.ts` module in `@freeclimb/core` that owns every FreeClimb REST path, query/body param shape, and response envelope: typed per-resource read functions (`getAccount`, `listCalls`, `getCall`, `listMessages`, `listIncomingNumbers`, `searchAvailableNumbers`, `listApplications`, `listLogs`, `filterLogs`, `listRecordings`, `listConferences`, `listQueues`, and their `get*`/`list*` siblings) plus a derived string-keyed `readResources` registry keyed by dashboard source name (`calls`, `sms`, `numbers`, ...). The MCP server, CLI dashboard, `status` command, and dev tooling all read through this seam instead of hand-building paths. `core/src/dashboard/data.ts`, beside the dashboard presets, owns `$source` binding extraction/validation against that registry and the polling `DashboardDataManager`; the CLI Ink renderer and the MCP `render_dashboard`/`generate_dashboard_prompt` tools are both thin adapters over this one implementation.

## Keyring

The operating system credential store where the MCP browser login and optional CLI login keep the Account ID and API Key. The agent-facing source of truth for credentials; never duplicated into chat or MCP config.

## Account

A FreeClimb customer account, identified by an Account ID and authenticated with an API Key.

## Application

A FreeClimb webhook configuration that tells FreeClimb where to send call and SMS events (for example a `voiceUrl`).

## Number

A FreeClimb phone number owned by an Account and assigned to an Application to receive or place calls and SMS.

## PerCL

FreeClimb's call-control language, expressed as JSON command arrays returned by a webhook to drive a call flow.

## PerCL guard hook

The `hooks/freeclimb-percl-guard.mjs` `afterFileEdit` hook. When the agent or user saves a file ending in `.percl.json`, it loads `@freeclimb/core`'s `validatePercl` and injects validation errors into the agent context so invalid PerCL is caught before a webhook response is deployed.

## Command executor

The `cli/src/executor.ts` module and its `runResourceCommand` pipeline. Generated oclif command files are thin stubs that declare a `CommandSpec`; the executor owns argument parsing, validation, HTTP dispatch, output formatting, and `--dry-run` handling so resource commands share one implementation path.

## Request limiter

The `core/src/request-limiter.ts` module and the pacing layer in `core/src/http.ts`. All authenticated FreeClimb REST traffic from MCP, CLI, and dashboard polling goes through one shared limiter: 5 request starts per second, at most 2 concurrent requests per process, adaptive cooldown on HTTP 429, and no automatic retries for POST/PATCH/DELETE. Override defaults with `FREECLIMB_REQUESTS_PER_SECOND`, `FREECLIMB_MAX_CONCURRENT_REQUESTS`, and `FREECLIMB_MAX_RETRIES`.

## Trial account

A FreeClimb account that can only place outbound calls or send SMS to pre-verified numbers. Inbound calls are unrestricted, making them the safest demo centerpiece.
