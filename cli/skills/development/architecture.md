# FreeClimb CLI Development

## Quick Start

```bash
npm install --ignore-scripts
npx tsc --noEmit       # Type check
npm test               # Run tests with coverage
npm run lint           # Check code style
npm run lint-write     # Fix lint + format
npm run prepack        # Build for distribution
```

## Gotchas

These will waste your time if you don't know them upfront:

1. **Running `node generation/commands/main.js` overwrites ALL generated files** — uncommitted changes to generated command files are destroyed. Always commit or stash first.
2. **`npm install --ignore-scripts` — the `--ignore-scripts` is critical** — without it, postinstall tries to build native deps (`@napi-rs/keyring`) which fails without a Rust toolchain.
3. **Nock mocks are global — `afterEach(() => nock.cleanAll())` is mandatory** — or mocks leak between tests causing cryptic failures in unrelated test files.
4. **`@napi-rs/keyring` import fails in CI (no keychain)** — tests that touch credentials must mock the keyring module or they'll throw at import time.
5. **`oclif manifest` must run after `tsc -b`** — stale manifest causes "command not found" at runtime even though the .ts files are correct.
6. **Adding a new flag to the schema requires regenerating BOTH commands AND tests** — running only the command generator leaves tests out of sync.

## Architecture

### Directory Layout

```
src/
├── commands/           # oclif v4 command implementations (mostly auto-generated)
├── mcp/                # MCP JSON-RPC server (server.ts, tools.ts)
├── ui/                 # Terminal UI components
│   ├── banner.ts       # ASCII art welcome banner
│   ├── chars.ts        # Unicode box-drawing chars, icons
│   ├── components.ts   # Reusable UI elements (boxes, badges, key-value)
│   ├── format.ts       # Topic-specific output formatters + wrapJsonOutput
│   ├── select.ts       # Interactive prompts (@inquirer/prompts)
│   ├── spinner.ts      # Built-in braille spinner
│   └── theme.ts        # Brand colors, TTY detection
├── agent-config.ts     # Output format detection (human/json/raw)
├── credentials.ts      # Keychain credential storage (@napi-rs/keyring)
├── environment.ts      # Environment variable configuration
├── errors.ts           # Error class hierarchy
├── error-messages.ts   # Error code → suggestion mappings
├── freeclimb.ts        # API client wrapper (axios)
├── output.ts           # Output/pagination manager
└── validation.ts       # Input validation (control chars, IDs, phones, URLs)

generation/
├── commands/
│   ├── main.js         # Command file generator (writes src/commands/*.ts)
│   ├── api-command.js  # ApiCommand class (endpoint, params, flags)
│   └── character-mapping.js  # Flag → short char mappings
├── schema/
│   ├── generated-api-schema.json  # API schema source
│   ├── description-overrides.json
│   └── local-flags.json
└── tests/              # Test file generator

test/                   # Mocha + Chai + Nock tests
```

### Command Pattern (oclif v4)

Commands follow this structure:

```typescript
import { Args, Command, Flags } from "@oclif/core"

export class exampleGet extends Command {
    static description = "..."
    static flags = {
        json: Flags.boolean({ description: "...", default: false }),
        fields: Flags.string({ description: "..." }),
        "dry-run": Flags.boolean({ description: "...", default: false }),
        help: Flags.help({ char: "h" }),
    }
    static args = {
        resourceId: Args.string({ description: "...", required: true }),
    }
    async run() {
        const { args, flags } = await this.parse(exampleGet)
        // ...
    }
}
```

### Auto-Generated Commands

Most command files in `src/commands/` are auto-generated from `generation/commands/main.js`.

**To modify command behavior**: Edit the generation templates, not the generated files.
**To add a new command**: Add it to the API schema and generation system.
**Manual commands** (not generated): `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`, `mcp/*.ts`

### Key Subsystems

For details on each subsystem, see `subsystems.md`.

- **Agent Config** (`agent-config.ts`): Detects output format preference
- **Validation** (`validation.ts`): Rejects adversarial input (control chars, path traversal, query injection)
- **Error System** (`errors.ts` + `error-messages.ts`): Structured errors with codes, suggestions, and CLI commands
- **Format System** (`ui/format.ts`): Topic-specific formatters + JSON envelope wrapper
- **MCP Server** (`mcp/server.ts` + `mcp/tools.ts`): JSON-RPC over stdio, 15+ tools

### Credential Priority

1. Environment variables (`FREECLIMB_ACCOUNT_ID`, `FREECLIMB_API_KEY`)
2. OS keychain via `@napi-rs/keyring`
3. `.env` file (dotenv)

## Testing

```bash
npm test                                    # All tests + coverage
npx mocha test/commands/sms-send.test.ts    # Single test
```

**Framework**: Mocha + Chai + Nock (HTTP mocking)
**Coverage**: nyc

Test files follow this pattern:

```typescript
import { runCommand } from "@oclif/test"
import { expect } from "chai"
import nock from "nock"

describe("sms:send", () => {
    afterEach(() => nock.cleanAll())
    it("sends an SMS", async () => {
        nock("https://www.freeclimb.com")
            .post(/Messages/)
            .reply(200, {
                /* response */
            })
        const { stdout } = await runCommand(["sms:send", "+1FROM", "+1TO", "Hello"])
        expect(stdout).to.contain("expected output")
    })
})
```

## Linting

```bash
npm run lint        # Check
npm run lint-write  # Fix + format (eslint + prettier)
```
