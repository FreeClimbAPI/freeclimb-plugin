# MCP Server (@freeclimb/mcp)

Standalone Model Context Protocol server for FreeClimb, built over `@freeclimb/core`.
Runs over stdio with no dependency on the oclif/ink CLI.

## Files
- `server.ts`: JSON-RPC server over stdio (tools, resources, prompts)
- `tools.ts`: Tool definitions
- `ui.ts`: MCP Apps UI (in-IDE FreeClimb-themed tables/cards)
- `auth.ts`: Self-initiated local browser auth flow (writes to the OS keyring)
- `bin.ts`: Standalone entry point (`node mcp/lib/bin.js`; `login` subcommand for auth)

## Running (v1, internal, no publish)
The plugin's `.mcp.json` launches the locally-built server from the synced repo:

```
node ${workspaceFolder}/mcp/lib/bin.js
```

Build it first from the workspace root: `npm run build`.

## Auth
Credentials live in the OS keyring (service `FreeClimb`), shared with the CLI's
`freeclimb login`. Run `node mcp/lib/bin.js login` to launch the browser flow.

## Notes
- Everything runs from the synced plugin repo; updates flow via the Cursor plugin
  sync setting. No npm publishing in v1.
- A hosted (non-stdio) MCP server is a v2 goal.
