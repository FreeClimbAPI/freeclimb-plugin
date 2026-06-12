# FreeClimb CLI

## Git Remotes — READ THIS FIRST

- `origin` = `FreeClimbAPI/freeclimb-cli` (upstream, READ-ONLY)
- `work` = `jbohnevail/freeclimb-cli` (fork, push here)
- **NEVER create PRs against FreeClimbAPI/freeclimb-cli**
- Always: `git push work <branch>` and `gh pr create --repo jbohnevail/freeclimb-cli`
- **Always base new branches on `work/main`** (never `origin/main`): `git checkout work/main -b <type>/<desc>`
- Before starting work, verify you're current: `git log --oneline work/main -1`

TypeScript CLI for the FreeClimb voice/SMS communications API, built with oclif v4.

## Quick Start

npm install --ignore-scripts
npx tsc --noEmit # Type check
npm test # Run tests with coverage
npm run lint # Check code style
npm run lint-write # Fix lint issues + format
npm run prepack # Build for distribution

## Directory Structure

src/
├── commands/ # oclif v4 command implementations (mostly auto-generated)
│ ├── accounts/ # Account management
│ ├── applications/ # App CRUD operations
│ ├── calls/ # Call management
│ ├── sms/ # SMS messaging
│ ├── conferences/ # Conference calls
│ ├── call-queues/ # Queue management
│ ├── recordings/ # Recording access
│ ├── logs/ # Log searching
│ └── mcp/ # MCP server command
├── mcp/ # MCP JSON-RPC server (server.ts, tools.ts)
├── ui/ # Terminal UI components (banner, format, theme, chars, spinner, select)
├── agent-config.ts # Output format detection (human/json/raw)
├── credentials.ts # Secure credential storage (@napi-rs/keyring)
├── environment.ts # Env var configuration
├── errors.ts # Error class hierarchy
├── error-messages.ts # Error code → suggestion mappings
├── freeclimb.ts # API client wrapper (axios)
├── output.ts # Output/pagination manager
└── validation.ts # Input validation (control chars, IDs, phones, URLs)

generation/ # Command code generation (schema → TypeScript)
test/ # Mocha/Chai tests with nock mocking
docs/ # Auto-generated command docs

## Architecture

### Command Pattern (oclif v4)

Commands use `@oclif/core`:

- `import { Args, Command, Flags } from "@oclif/core"`
- Static `description`, `flags` (using `Flags.*`), `args` (using `Args.*` object format)
- Async `run()` with `await this.parse(ClassName)`

### Auto-Generated Code

Most command files in `src/commands/` are auto-generated from `generation/commands/main.js`.
Edit templates in `generation/commands/`, not the generated files.
Manual commands: `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`, `mcp/*.ts`

### Agent-DX Features

- `--json` flag for JSON output (auto-enabled via `FREECLIMB_OUTPUT_FORMAT=json`)
- `--quiet` flag for bare ID output (one per line, pipe-friendly)
- `--fields` flag to limit response fields (context window protection)
- `--dry-run` flag for mutating operations (create/update/delete)
- `--yes` flag on `login` for non-interactive authentication (with `--accountId` and `--apiKey`)
- `freeclimb describe` for machine-readable schema introspection
- Input validation: control chars, path traversal, query injection rejected
- `static examples` on all generated commands (visible via `--help`)

### Credential Management

Priority order:

1. Environment variables: FREECLIMB_ACCOUNT_ID, FREECLIMB_API_KEY
2. OS keychain via @napi-rs/keyring (`freeclimb login`)
3. .env file (dotenv)

### Error Handling

Hierarchy: FreeClimbError → ParseError, APIError, DefaultFatalError
Structured error suggestions with codes, messages, CLI commands, and doc URLs.

### Output Formatting

- Topic-specific formatters in `src/ui/format.ts`
- JSON envelope via `wrapJsonOutput()` with `success`, `data`, `metadata`
- Pagination with `--next` cursor

## Testing

Framework: Mocha + Chai + Nock (HTTP mocking)
Coverage: nyc
Runner: `@oclif/test` v4 `runCommand()` API
Setup: `test/setup.ts` sets test credentials and disables HTTP retries

Run specific test:
npx mocha --require ts-node/register --require test/setup.ts test/commands/sms-send.test.ts

## MCP Integration

Built-in MCP server exposes 15+ tools for AI agents:
freeclimb mcp:start

Tools: calls, sms, numbers, applications, conferences, queues

## Skills

.claude/skills/freeclimb-cli/ # Using the CLI (for agents)
.claude/skills/freeclimb-cli-dev/ # Developing the CLI (for contributors)
.claude/skills/freeclimb-command-gen/ # Working with the code generation system
.claude/skills/agent-tui/ # Terminal UI automation testing
