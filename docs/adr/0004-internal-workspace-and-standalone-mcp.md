# 4. Internal core/cli/mcp workspace with a repo-synced standalone MCP

Status: Accepted

> npm workspace, `package-lock.json`, and `npm run setup` details are superseded by [ADR 0008](0008-pnpm-package-manager.md).

Supersedes the distribution mechanism of ADR 0002 (bundled-build global install) and updates the credential-entry mechanism of ADR 0003 (adds a browser/loopback login alongside `freeclimb login`).

## Context

ADR 0002 put the MCP server inside the oclif/ink CLI and required a first-run global build+install (`npm i -g .`) so `freeclimb` was on PATH. That coupled every MCP user to a full CLI toolchain build, relied on undocumented self-location and a writable npm prefix, and made the MCP unusable for non-technical users who only want in-IDE tools. The CLI itself is a fork of the public `freeclimb-cli` that has not been merged or republished, so we cannot depend on a registry install.

We also want the MCP to be the primary surface (it is the easiest path with the best in-IDE observability) and to be able to expand it independently of the CLI.

## Decision

Restructure the repository into an internal npm workspace of three packages:

- `@freeclimb/core` (`private`) — shared http, credentials (keyring), environment, validation, errors, FreeClimb client, and PerCL generate/validate.
- `freeclimb-cli` — thin oclif/ink frontend over `core`, an optional power-user surface.
- `@freeclimb/mcp` (`private`) — a standalone Model Context Protocol server over stdio, built over `core`, with no dependency on the CLI.

For v1, nothing is published to npm. `@freeclimb/core` and `@freeclimb/mcp` are `private` and consumed via workspace symlinks; the whole repo ships and auto-updates through the Cursor plugin sync setting. A committed root `package-lock.json` provides reproducible installs.

The MCP runs from the synced repo: `.mcp.json` uses `command: "node"`, `args: ["mcp/lib/bin.js"]` (a plugin-relative path; Cursor spawns stdio servers with the plugin install directory as cwd). A one-time `npm run setup` (`npm install && npm run build`) installs dependencies and produces `mcp/lib`. There is no `npx`, no registry fetch at runtime, and no global CLI build.

Authentication adds a self-initiated local browser (loopback) flow (`node mcp/lib/bin.js login`): a `127.0.0.1`-bound HTTP server with a one-time state token captures the Account ID and API Key and writes them to the OS keyring (never to chat, logs, or disk). `freeclimb login` remains available for CLI users; both write the same keyring entry.

Agent guidance is standardized on `AGENTS.md` (Cursor-only for v1); `CLAUDE.md` files are removed and may return in a later version if/when the plugin targets Claude.

## Consequences

- The MCP works without building or installing the CLI; the CLI install becomes an optional power-user path.
- Updates flow through Cursor plugin sync; MCP version tracks the synced plugin, so there is no independent pin to manage.
- Removing the build-from-source global install and any runtime fetch-and-execute surface resolves the supply-chain concern from the security review (F3); integrity comes from the synced repo plus the committed lockfile.
- Build artifacts (`lib/`, `*.tsbuildinfo`) are git-ignored; a one-time `npm run setup` is required after first sync (and is safe to re-run after updates).
- The loopback login is a new local secret-handling surface (security review F9); it is hardened (loopback-only bind, one-time CSRF/state token, short TTL, immediate shutdown, request-body cap, keyring-only write).

## v2 / future work

Stand up a hosted (non-stdio) MCP server and a republished, signed `freeclimb-cli`, at which point `@freeclimb/core` and `@freeclimb/mcp` can be published to npm and onboarding can drop the local build step. Re-add `CLAUDE.md` when targeting Claude.

## Alternatives considered

- Publish `@freeclimb/mcp` to npm and launch via `npx` (pinned + integrity): rejected for v1 because the forked CLI/core are not yet republished and we prefer no registry dependency; deferred to v2.
- Keep the MCP inside the CLI (ADR 0002): rejected; it forces a CLI toolchain build on every MCP user and blocks non-technical adoption.
- Launch via `${workspaceFolder}`: rejected; unreliable for a synced plugin. Plugin-relative paths resolve against the plugin install directory.
