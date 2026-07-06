# FreeClimb CLI Development

## Quick Start

```bash
pnpm install
pnpm exec tsc --noEmit       # Type check
pnpm test               # Run tests with coverage
pnpm run lint           # Check code style
pnpm run lint-write     # Fix lint + format
pnpm run prepack        # Build for distribution
```

## Architecture

### Directory Layout

```
src/
├── commands/           # oclif v4 command implementations
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

### Commands

Command modules live under `src/commands/`. Manual commands (not part of the standard resource CRUD set): `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`, `mcp/*.ts`

### Key Subsystems

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
pnpm test                                    # All tests + coverage
pnpm exec mocha test/commands/sms-send.test.ts    # Single test
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
            .reply(200, { /* response */ })
        const { stdout } = await runCommand(["sms:send", "+1FROM", "+1TO", "Hello"])
        expect(stdout).to.contain("expected output")
    })
})
```

## Linting

```bash
pnpm run lint        # Check
pnpm run lint-write  # Fix + format (eslint + prettier)
```
