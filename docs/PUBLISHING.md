# Publishing the CLI (optional / future)

Today the plugin runs the MCP server from the synced private workspace via `node mcp/lib/bin.js` (see [ADR 0004](adr/0004-internal-workspace-and-standalone-mcp.md) and [ADR 0005](adr/0005-read-only-mcp-cli-for-actions.md)). Publishing the CLI to npm is optional future work for the power-user CLI surface.

## Goal

Publish the `cli/` package so power users can install the CLI without building the workspace locally.

## Prerequisites

- npm publish rights to the `freeclimb-cli` package (currently owned under `dev@freeclimb.com`). If those rights cannot be obtained, publish under a scoped name you control (for example `@freeclimbapi/cli`).

## Steps

1. In `cli/package.json`, confirm `name`, `version`, `bin` (`freeclimb`), and the `files` whitelist (`/bin`, `/lib`, `/oclif.manifest.json`, `/skills`).
2. Build and test:

   ```bash
   cd cli
   corepack enable && corepack prepare --activate
   pnpm install
   pnpm run prepack
   pnpm test
   ```

3. Publish:

   ```bash
   npm publish
   ```

4. Smoke test on a clean machine:

   ```bash
   npm i -g freeclimb-cli
   freeclimb login
   freeclimb status
   ```

## Plugin wiring

Keep plugin MCP wiring on `node mcp/lib/bin.js` unless the MCP package is also published and signed:

- `skills/freeclimb-onboarding/SKILL.md`: mention the published CLI as optional for power users.
- `.mcp.json`: keep `command: "node"` and `args: ["mcp/lib/bin.js"]` for the plugin-managed read-only MCP server.
