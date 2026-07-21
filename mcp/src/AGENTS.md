# MCP Server (@freeclimb/mcp)

Standalone Model Context Protocol server for FreeClimb, built over `@freeclimb/core`.
Runs over stdio with no dependency on the oclif/ink CLI.

## Files
- `server.ts`: Protocol glue only — creates the JSON-RPC server, registers schemas, wires the
  stdio transport, and delegates to `registry.ts`/`resources.ts`/`prompts.ts`
- `registry.ts`: Single source of truth for MCP tools — each entry defines name, description,
  inputSchema, and handler. Exports `tools`, `handlers`, and `dispatchTool`. Handlers map
  validated args to `@freeclimb/core` calls via an injectable `HandlerContext`, so tests can
  stub core functions without module mocking
- `handlers.ts`: Re-exports from `registry.ts` for backward compatibility
- `parse-args.ts`: Shared JSON-schema argument parsing for tool handlers
- `resources.ts`: Resolves `freeclimb://` resources — the account/numbers/applications JSON
  resources and the `freeclimb://skills/*` markdown docs (read from `cli/skills/`, falling back
  to the plugin `skills/`)
- `prompts.ts`: Prompt definitions (`diagnose`, `dashboard`) and the dashboard system prompt text
- `tools.ts`: Tool definitions (re-exported from `registry.ts`)
- `ui.ts`: MCP Apps UI (in-IDE FreeClimb-themed tables/cards)
- `auth.ts`: Self-initiated local browser auth flow (writes to the OS keyring)
- `bin.ts`: Standalone entry point (`node mcp/lib/bin.js`; `login` subcommand for auth)

## Tools (33 read-only)
Account: `get_account`. Calls: `list_calls`, `get_call`, `list_call_logs`. SMS: `list_sms`,
`get_sms`. Numbers: `list_numbers`, `get_number`, `search_available_numbers`. Applications:
`list_applications`, `get_application`. Logs: `list_logs`, `filter_logs`. Recordings:
`list_recordings`, `get_recording`. Conferences: `list_conferences`, `get_conference`,
`list_conference_participants`. Queues: `list_queues`, `get_queue`, `list_queue_members`.
10DLC: `list_brands`, `get_brand`, `list_campaigns`, `get_campaign`, `list_partner_campaigns`,
`get_partner_campaign`. Exports: `list_exports`, `get_export`. Local helpers:
`generate_percl`, `validate_percl`, `generate_dashboard_prompt`, `render_dashboard`.

## Running (v1, internal, no publish)
The plugin's `.mcp.json` launches the locally-built server from the synced repo:

```
node ${CURSOR_PLUGIN_ROOT}/mcp/lib/bin.js
```

Build it first from the workspace root: `pnpm run build`.

## Auth
Credentials live in the OS keyring (service `FreeClimb`), shared with the CLI's
`freeclimb login`. Run `node mcp/lib/bin.js login` to launch the browser flow.

## Notes
- Everything runs from the synced plugin repo; updates flow via the Cursor plugin
  sync setting. No npm publishing in v1.
- A hosted (non-stdio) MCP server is a v2 goal.
