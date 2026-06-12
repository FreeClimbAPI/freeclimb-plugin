# Development Workflows

Common commands for building, testing, and running the FreeClimb CLI.

## Build

Compile TypeScript and generate distribution files:

```bash
npm run prepack
```

This runs:
1. TypeScript compilation
2. oclif manifest generation
3. Documentation build

## Type Check

```bash
npx tsc --noEmit
```

Run after any code changes to catch type errors without producing output files.

## Test

Run the full test suite with coverage:

```bash
npm test
```

Run a specific test file:

```bash
npx mocha test/commands/sms-send.test.ts
```

Framework: Mocha + Chai + Nock (HTTP mocking). Coverage: nyc.

## Lint

Check code style:

```bash
npm run lint
```

Fix lint issues and format code:

```bash
npm run lint-write
```

Uses ESLint + Prettier.

## MCP Server

Start the MCP server for testing AI agent integration:

```bash
node bin/run mcp:start
```

Runs the JSON-RPC MCP server over stdio. Requires valid FreeClimb credentials (env vars or keychain).

## Code Generation

Regenerate all command files from the API schema:

```bash
node generation/commands/main.js
```

Regenerate test files:

```bash
node generation/tests/main.js
```

Always run `npx tsc --noEmit` and `npm test` after generation.

## Full Verification

```bash
npx tsc --noEmit && npm run lint && npm test
```
