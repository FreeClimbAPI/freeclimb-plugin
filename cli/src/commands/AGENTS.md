# Commands Directory

## Layout

Command implementations live in this directory as oclif v4 TypeScript modules. Manual (non-generated,
non-executor) commands include `api.ts`, `describe.ts`, `diagnose.ts`, `login.ts`, `logout.ts`, `status.ts`,
`dashboard.ts`, `data.ts`, `dev.ts`, `listen.ts`, `update.ts`, `autocomplete/index.ts`, `accounts/manage.ts`,
and `mcp/*.ts`.

## Command shape

Every resource command uses the stub-over-executor shape: `run()` builds a declarative `CommandSpec`
(see `../executor.ts`) and calls `runResourceCommand(this, spec)`. The executor owns validation, dry-run
preview, confirmation prompts, the promise-based API request (`apiRequest`/`publicRequest` from
`@freeclimb/core`), 204 handling, quiet-id extraction, `--fields` filtering, the JSON envelope, human
rendering, cursor pagination, tail polling, and error-code mapping.

Bespoke commands that stream or download binary data (`recordings/download.ts`, `recordings/stream.ts`)
call `apiRequest` directly and reuse `handleCommandError` from `../executor.ts` for consistent error
mapping. The legacy callback-based `FreeClimbApi` pipeline has been removed.

## Command Structure (oclif v4)
Each command file:
- Imports `{ Args, Command, Flags } from "@oclif/core"`
- Uses `Flags.boolean()`, `Flags.string()`, `Args.string()` for definitions
- Includes `--json`, `--fields`, `--dry-run` (mutating only) flags
- Declares `validations` on the `CommandSpec`; the executor calls `parse()` and runs validations itself.

## Adding a New Command
1. Prefer the stub-over-executor shape for any new resource command: define static
   `description`/`examples`/`flags`/`args`, then build a `CommandSpec` and call `runResourceCommand(this,
   spec)` in `run()`.
2. Verify: `pnpm exec tsc --noEmit`
3. Add tests in `test/commands/`
