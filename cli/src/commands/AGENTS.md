# Commands Directory

## Auto-Generated Code
Most files here are auto-generated from `generation/commands/main.js`.
To modify command behavior, edit the generation templates there.

Manual (non-generated) commands: `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`, `mcp/*.ts`

## Command Structure (oclif v4)
Each command file:
- Imports `{ Args, Command, Flags } from "@oclif/core"`
- Uses `Flags.boolean()`, `Flags.string()`, `Args.string()` for definitions
- Uses `await this.parse(ClassName)` for argument parsing
- Includes `--json`, `--fields`, `--dry-run` (mutating only) flags
- Validates inputs via `validateResourceId()`, `rejectControlChars()`

## Adding a New Command
1. Add endpoint to `generation/schema/generated-api-schema.json`
2. Run `node generation/commands/main.js`
3. Verify: `npx tsc --noEmit`
4. Add tests in `test/commands/`
