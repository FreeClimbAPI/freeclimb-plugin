# FreeClimb Command Generation

## Gotchas

These fail silently and waste time:

1. **The generator output contains oclif v2 syntax that must be manually patched to v4** — `this.parse` to `await this.parse`, static `args` array to object format, etc. Always verify with `npx tsc --noEmit` after generating.
2. **`character-mapping.js` short flags are global** — two commands can't share the same short char for different flags. Adding `-n` to a new command may break an existing one.
3. **`local-flags.json` flags are injected AFTER API flags** — name collisions silently overwrite the API flag definition.
4. **`description-overrides.json` is matched by exact `topic:command` key** — typos fail silently (the override is never applied).
5. **Running the test generator after modifying test templates regenerates ALL test files** — review the full diff carefully, not just the files you intended to change.

## Overview

Most CLI commands in `src/commands/` are auto-generated from API schema definitions.
The generation pipeline: **Schema JSON to ApiCommand objects to TypeScript files**

## Pipeline

```
generation/
├── schema/
│   ├── generated-api-schema.json    # API endpoint definitions (source of truth)
│   ├── description-overrides.json   # Custom command/flag descriptions
│   └── local-flags.json             # CLI-only flags not from the API
├── commands/
│   ├── main.js                      # Orchestrator: reads schema, writes .ts files
│   ├── api-command.js               # ApiCommand class: parses schema entries
│   └── character-mapping.js         # Maps flag names to short chars (-n, -d, etc.)
└── tests/
    ├── main.js                      # Test file generator
    └── cases.js                     # Test case templates
```

## Running Generation

```bash
node generation/commands/main.js
```

This overwrites files in `src/commands/<topic>/<action>.ts` and updates `package.json` topic descriptions.

## Schema Format

Each topic in `generated-api-schema.json`:

```json
{
  "topic": "calls",
  "description": "See past calls and make new calls",
  "commands": [
    {
      "commandName": "list",
      "description": "Retrieve a list of calls...",
      "method": "GET",
      "endpoint": "Calls",
      "usesAuthentication": true,
      "pagination": true,
      "params": [...],
      "args": [...]
    }
  ]
}
```

## Adding a New Command

1. Add the endpoint definition to `generation/schema/generated-api-schema.json`
2. Optionally add description overrides in `description-overrides.json`
3. Optionally add CLI-only flags in `local-flags.json`
4. Run `node generation/commands/main.js`
5. Run the v4 migration fix (see below)
6. Verify: `npx tsc --noEmit`
7. Add tests in `test/commands/`

## oclif v4 Compatibility

The generator outputs oclif v4 code:

- `import { Args, Command, Flags } from "@oclif/core"`
- `Flags.boolean(`, `Flags.string(`, `Args.string(`
- `await this.parse(ClassName)`
- Args use object format: `{ name: Args.string({...}) }`

## What the Generator Produces

Each generated command includes:

| Feature           | Implementation                                                     |
| ----------------- | ------------------------------------------------------------------ |
| `--json` flag     | `getOutputFormat(flags.json)` to JSON envelope                     |
| `--fields` flag   | `filterFieldsDeep(data, fields)`                                   |
| `--dry-run` flag  | Shows payload without API call (mutating only)                     |
| Input validation  | `validateResourceId()` for IDs, `rejectControlChars()` for strings |
| Output formatting | Topic formatter or JSON via `wrapJsonOutput()`                     |
| Pagination        | `--next` flag with cursor-based paging                             |

## Key Functions in main.js

| Function                                                  | Purpose                                |
| --------------------------------------------------------- | -------------------------------------- |
| `getFileContents(command)`                                | Renders complete TypeScript file       |
| `getAxiosFlags(flags)`                                    | Generates flag definitions from schema |
| `getAdditionalFlags(topic, tail, pagination, isMutating)` | Adds json/fields/dry-run/next flags    |
| `getAxiosArgs(args, tail)`                                | Generates arg definitions              |
| `getInputValidation(command)`                             | Generates validation calls             |
| `getDryRunCheck(command)`                                 | Generates dry-run short-circuit        |
| `isMutatingMethod(method)`                                | POST/PUT/DELETE/PATCH check            |

## Manual (Non-Generated) Commands

These commands are hand-written and NOT touched by the generator:

- `src/commands/api.ts` — Raw API access
- `src/commands/describe.ts` — Schema introspection
- `src/commands/diagnose.ts` — System diagnostics
- `src/commands/login.ts` / `logout.ts` — Authentication
- `src/commands/status.ts` — Account status
- `src/commands/mcp/start.ts` / `config.ts` — MCP server

## Test Generation

```bash
node generation/tests/main.js
```

Generates test files in `test/commands/`. Test templates cover:
status codes, required params, boolean inputs, max-item flags, next-flag pagination.
