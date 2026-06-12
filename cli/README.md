# FreeClimb CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/freeclimb-cli.svg)](https://npmjs.org/package/freeclimb-cli)
[![License](https://img.shields.io/npm/l/freeclimb-cli.svg)](https://github.com/FreeClimbAPI/freeclimb-cli/blob/master/package.json)

Command-line interface for the [FreeClimb](https://www.freeclimb.com/) voice and SMS communications API. Built with [oclif](https://oclif.io), designed for developers and AI agents.

## Requirements

- [Node.js](https://nodejs.org/) >= 18.0.0
- A [FreeClimb account](https://freeclimb.com/dashboard/)

## Install

```sh
npm install -g freeclimb-cli
```

## Quick Start

```sh
freeclimb login
freeclimb sms:send +1FROM +1TO "Hello from FreeClimb"
freeclimb calls:list --fields callId,status,from,to --json
```

## Authentication

### Interactive

```sh
freeclimb login
```

### Environment Variables (headless / agent use)

```sh
export FREECLIMB_ACCOUNT_ID=your_account_id
export FREECLIMB_API_KEY=your_api_key
```

## Usage

```sh
freeclimb help                     # Show topics and commands
freeclimb [TOPIC]                  # Explore commands in a topic
freeclimb [COMMAND] --help         # Command usage details
freeclimb describe [COMMAND]       # Machine-readable schema (JSON)
```

## Command Topics

| Topic | Description |
|-------|-------------|
| [`accounts`](docs/accounts.md) | View and manage account settings |
| [`applications`](docs/applications.md) | CRUD for FreeClimb applications (webhook endpoints) |
| [`available-numbers`](docs/available-numbers.md) | Search phone numbers available for purchase |
| [`call-queues`](docs/call-queues.md) | Create and manage call queues |
| [`calls`](docs/calls.md) | Make, list, get, and update voice calls |
| [`conference-participants`](docs/conference-participants.md) | Manage conference participants |
| [`conferences`](docs/conferences.md) | Create and manage conference calls |
| [`incoming-numbers`](docs/incoming-numbers.md) | Manage purchased phone numbers |
| [`logs`](docs/logs.md) | Search and filter API logs |
| [`queue-members`](docs/queue-members.md) | Manage call queue members |
| [`recordings`](docs/recordings.md) | Access and manage call recordings |
| [`sms`](docs/sms.md) | Send and manage SMS messages |

### Utility Commands

| Command | Description |
|---------|-------------|
| `api` | Make authenticated raw API requests |
| `describe` | Machine-readable command schema introspection |
| `diagnose` | System diagnostics and connectivity check |
| `status` | Account status overview |
| `mcp:start` | Start MCP server for AI agent integration |

## Key Features

### Agent-Friendly Output

```sh
freeclimb calls:list --json                          # JSON output
freeclimb calls:list --fields callId,status,from,to  # Limit fields
export FREECLIMB_OUTPUT_FORMAT=json                  # Global JSON mode
```

### Safety Rails

```sh
freeclimb sms:send +1FROM +1TO "Hello" --dry-run     # Preview without executing
freeclimb applications:delete APP_ID --dry-run        # Validate before deleting
```

### Schema Introspection

```sh
freeclimb describe              # List all topics
freeclimb describe calls        # Commands in a topic
freeclimb describe calls:list   # Full flag/arg schema
freeclimb describe --all        # Everything
```

### Raw API Access

```sh
freeclimb api /Calls --fields callId,status
freeclimb api /Messages --method POST -d '{"to":"+15551234567","from":"+15559876543","text":"Hello"}'
```

### MCP Integration

For AI agents that prefer structured JSON-RPC:

```sh
freeclimb mcp:start      # Start MCP server (stdio)
freeclimb mcp:config     # Print Claude Desktop config
```

## Examples

### Send SMS

```sh
freeclimb sms:send +15551234567 +15559876543 "Hello from FreeClimb" --dry-run
freeclimb sms:send +15551234567 +15559876543 "Hello from FreeClimb"
```

### Make a Call

```sh
freeclimb calls:make +15551234567 +15559876543 AP1234567890 --dry-run
freeclimb calls:make +15551234567 +15559876543 AP1234567890
```

### Manage Applications

```sh
freeclimb applications:list --fields applicationId,alias --json
freeclimb applications:create --alias "MyApp" --voiceUrl "https://example.com/voice" --dry-run
```

### Buy a Number

```sh
freeclimb available-numbers:list --fields phoneNumber,region --json
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --dry-run
```

## Development

```sh
git clone https://github.com/FreeClimbAPI/freeclimb-cli.git
cd freeclimb-cli
npm run setup             # Install, build, and verify (recommended)
```

Or manually:

```sh
npm install --ignore-scripts
npx tsc --noEmit          # Type check
npm test                  # Run tests
npm run lint-write        # Lint and format
npm run prepack           # Build for distribution
```

### AI Agent Integration

MCP server configs are auto-discovered by Claude Code (`.mcp.json`), Cursor (`.cursor/mcp.json`), and VS Code Copilot (`.vscode/mcp.json`). After `npm run setup`, set `FREECLIMB_ACCOUNT_ID` and `FREECLIMB_API_KEY` in the config files or your environment. See [AGENTS.md](AGENTS.md) for details.

## Contributing

See [CLAUDE.md](CLAUDE.md) for architecture details and development conventions.

## Feedback & Issues

[Contact support](https://www.freeclimb.com/support/) or [submit a ticket](https://freeclimb.com/dashboard/portal/support).
