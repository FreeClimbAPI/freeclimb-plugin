# 2. Bundled-build onboarding for the CLI

Status: Accepted

## Context

Cursor distributes a team plugin by syncing the repository as-is: there is no install step, no build step, no `${pluginDir}` variable, and an MCP STDIO `command` must be on PATH or an absolute path (per Cursor docs). The plugin's MCP server runs `freeclimb`, which must therefore exist on the user's PATH. The canonical `freeclimb-cli` npm package is not under our control and lacks the MCP feature, so we cannot rely on `npm i -g freeclimb-cli` today.

## Decision

Ship the CLI source in `cli/` and provide a first-run `/freeclimb-setup` flow (command + `freeclimb-onboarding` skill) that builds and globally installs the bundled CLI from source (`npm install` then `npm i -g .`), putting `freeclimb` on PATH. The `.mcp.json` uses `command: "freeclimb"`. A `sessionStart` hook nudges the user to run setup when the CLI is missing, and a `beforeMCPExecution` hook fails gracefully with a pointer to `/freeclimb-setup` instead of a cryptic MCP crash.

## Consequences

- The plugin works without any npm publish.
- Setup relies on undocumented behavior: the agent locates `cli/` from the skill's own absolute path (fallback: globbing `~/.cursor/plugins/**/freeclimb/cli`). This can break on Cursor updates.
- Setup requires Node >= 20 and a build toolchain; native modules (`@napi-rs/keyring`, `@ngrok/ngrok`) compile at install time and can fail on some machines.
- `npm i -g .` may need a user-writable npm prefix to avoid permission errors.
- After a plugin update, the globally linked CLI is not auto-rebuilt; `/freeclimb-setup` is safe to re-run to refresh it.

## Escape hatch

Publishing the CLI to npm (see ADR 0003 of the CLI, or future work) lets onboarding replace build+link with `npm i -g freeclimb-cli`, removing the self-location and toolchain risks.

## Alternatives considered

- Relative/bundled path in `.mcp.json`: not documented-safe (no plugin-dir variable; no build step).
- Require manual global npm install before publish exists: blocked by the same publish-control problem.
