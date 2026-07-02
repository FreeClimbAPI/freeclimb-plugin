# 6. Blocking CI with workspace-wide test coverage

Status: Accepted

## Context

The CI `test` job ran `npm run lint` and `npm test` with `continue-on-error: true`, annotated "some tests need a keychain/TTY in CI". That made every lint and test regression invisible: CI stayed green while the CLI suite had 3 failing login tests (broken by the non-TTY fail-fast path added for agent ergonomics), an orphaned `test/generation/` suite importing a `generation/` directory that no longer exists in this repo, and 161 lint errors. Meanwhile `core/` and `mcp/` — the packages that carry validation, PerCL, credentials plumbing, and the read-only MCP tool surface — had no tests at all, so the monorepo's most security-relevant code had less coverage than the CLI frontend.

Only two things genuinely cannot run in a headless CI runner: the OS-keychain round-trip test and interactive TTY prompts.

## Decision

Make lint and test blocking in CI and give every workspace a suite:

- Remove `continue-on-error` from the lint and test steps in `.github/workflows/ci.yml`.
- Gate keychain-dependent assertions at runtime: `cli/test/keytar.test.ts` probes keychain availability and skips (not fails) where no keychain is present. TTY-dependent login tests force `process.stdout.isTTY` so they exercise the interactive path deterministically.
- Delete the orphaned `cli/test/generation/` suite; the code generator it tested lives in the upstream CLI repo, not this monorepo.
- Add `node:test`-based suites (no new dependencies) to `core/` (validation, PerCL generate/validate, dashboard presets) and `mcp/` (tool definitions, MCP Apps UI payloads) with `test` scripts, so the root `npm test --workspaces --if-present` runs all three packages.
- The `mcp/` suite asserts the tool surface is exactly the 19 read-only tools and contains no mutating tool names, mechanically pinning ADR 0005.

## Consequences

- Lint or test regressions now fail PRs instead of passing silently; the pre-existing debt this masked (3 test failures, 161 lint errors, dead suite) was paid down as part of this change.
- Keychain coverage is best-effort: the keyring round-trip runs on developer machines with a keychain and skips on bare CI runners. A CI keychain (e.g. unlocked login keychain on macOS runners) can upgrade this later.
- Adding a mutating MCP tool now fails a test in addition to violating ADR 0005 on paper.
