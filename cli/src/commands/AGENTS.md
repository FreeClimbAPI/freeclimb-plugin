# Commands Directory

## Layout

Command implementations live in this directory as oclif v4 TypeScript modules. Most command files follow a shared generated shape; manual commands include `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`, and `mcp/*.ts`.

## Command Structure (oclif v4)
Each command file:
- Imports `{ Args, Command, Flags } from "@oclif/core"`
- Uses `Flags.boolean()`, `Flags.string()`, `Args.string()` for definitions
- Uses `await this.parse(ClassName)` for argument parsing
- Includes `--json`, `--fields`, `--dry-run` (mutating only) flags
- Validates inputs via `validateResourceId()`, `rejectControlChars()`

## Adding a New Command
1. Add or update the command under `src/commands/`
2. Verify: `pnpm exec tsc --noEmit`
3. Add tests in `test/commands/`
