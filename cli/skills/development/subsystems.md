# FreeClimb CLI Subsystems Reference

## Agent Config (`src/agent-config.ts`)

Controls output format detection:

- `getOutputFormat(flagJson?, flagRaw?)` → `"human" | "json" | "raw"`
- `shouldUseColor()` → respects TTY and `NO_COLOR`
- `isAgentMode()` → true when `FREECLIMB_OUTPUT_FORMAT` is set

Precedence: `--raw` flag > `--json` flag > `FREECLIMB_OUTPUT_FORMAT` env var > default human

## Validation (`src/validation.ts`)

Input validation for adversarial safety:

| Function | Rejects |
|----------|---------|
| `rejectControlChars(input, field)` | Chars below 0x20 (except newline, CR, tab) |
| `validateResourceId(id, field)` | Empty, `?`, `#`, `%`, path traversal `../` |
| `validatePhoneNumber(num, field)` | Non-E.164 format |
| `validateUrl(url, field)` | Invalid URLs |
| `filterFieldsDeep(data, fields)` | N/A - filters response fields |
| `sanitizeInput(input)` | N/A - strips control chars |

All accept `string | undefined` and return void (throw `ValidationError` on failure).

## Error System

### Error Classes (`src/errors.ts`)

| Class | Code | Use |
|-------|------|-----|
| `FreeClimbError` | — | Base class |
| `ParseError` | 2 | CLI argument/flag parse failures |
| `FreeClimbAPIError` | 3 | API response errors |
| `UndefinedResponseError` | — | Missing response data |
| `DefaultFatalError` | — | Unexpected errors |
| `NoNextPage` | — | Pagination end |
| `NoTimestamp` | — | Missing timestamp in log filter |

### Error Suggestions (`src/error-messages.ts`)

Maps FreeClimb error codes (0-77) to:
- Human-readable message
- Suggested CLI commands to try
- Documentation URL

`errorWithSuggestions(errorM)` formats errors with colored output:
- Red error message
- Bold code and suggestion
- Yellow "Try:" section with numbered commands
- Dim help URL

## Format System (`src/ui/format.ts`)

### JSON Envelope

`wrapJsonOutput(data, metadata?)` wraps response data:
```json
{
  "success": true,
  "data": { ... },
  "metadata": { "timestamp": "...", "command": "..." }
}
```

### Topic Formatters

`getFormatterForTopic(topic, action)` returns topic-specific formatters for human-readable output.
Formatters exist for: calls, sms, applications, incoming-numbers, recordings, conferences, call-queues, accounts.

### Table Formatting

- `formatTable(rows, columns)` — basic tabular output
- `formatTableWithBorders(rows, columns)` — bordered table with box-drawing chars

## UI Components (`src/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| `getWelcomeBanner()` | `banner.ts` | ASCII art header shown on `freeclimb --help` |
| `BrandColors` | `theme.ts` | darkTeal, lightTeal, orange, lime hex values |
| `supportsColor()` | `theme.ts` | True color detection |
| `isTTY()` | `theme.ts` | TTY detection |
| `getBoxChars()` | `chars.ts` | Unicode vs ASCII box-drawing char sets |
| `icons` | `chars.ts` | success check, error x, warning triangle, info i |
| `createSpinner()` | `spinner.ts` | Braille-pattern loading spinner |
| `select()` | `select.ts` | Interactive menu (via @inquirer/prompts) |
| `sectionHeader()` | `components.ts` | Styled section dividers |
| `borderedBox()` | `components.ts` | Content in bordered boxes |
| `statusBadge()` | `components.ts` | Colored status indicators |

## MCP Server (`src/mcp/`)

JSON-RPC over stdio implementing the Model Context Protocol.

**`server.ts`**: Main server loop - reads JSON-RPC from stdin, dispatches to tool handlers, writes responses to stdout.

**`tools.ts`**: Tool definitions and handlers. Each tool maps to a CLI command:

| Tool | CLI Equivalent |
|------|---------------|
| `make_call` | `calls:make` |
| `list_calls` | `calls:list` |
| `send_sms` | `sms:send` |
| `list_applications` | `applications:list` |
| `get_application` | `applications:get` |
| `search_available_numbers` | `available-numbers:list` |
| `get_account` | `accounts:get` |
| ... | ... |

## Generation System (`generation/`)

### Schema to Code Pipeline

1. `generation/schema/generated-api-schema.json` defines all API endpoints
2. `generation/commands/api-command.js` parses schema into `ApiCommand` objects
3. `generation/commands/main.js` renders TypeScript command files from templates
4. Output goes to `src/commands/<topic>/<action>.ts`

### What the Generator Adds

Each generated command includes:
- Agent-DX flags: `--json`, `--fields`, `--dry-run` (mutating only)
- Input validation: `validateResourceId()` for IDs, `rejectControlChars()` for strings
- Output formatting: JSON envelope via `wrapJsonOutput()` or topic formatters
- Pagination: `--next` flag with cursor-based pagination

### Modifying Generated Commands

1. Edit templates in `generation/commands/main.js`
2. Run the generation script
3. Verify with `npx tsc --noEmit`
4. Run tests with `npm test`

### Description Overrides

`generation/schema/description-overrides.json` customizes command/flag descriptions.
`generation/schema/local-flags.json` adds CLI-only flags not from the API schema.

## Describe Command (`src/commands/describe.ts`)

Machine-readable schema introspection for agents:

```bash
freeclimb describe              # List topics with their commands
freeclimb describe calls        # All commands in the calls topic
freeclimb describe calls:list   # Full schema: flags, args, description
freeclimb describe --all        # Everything
```

Output is always JSON. Includes flag types, required status, descriptions, options, and char shortcuts.
