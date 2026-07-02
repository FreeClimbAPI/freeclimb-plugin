# Changelog

## 0.3.0

- CI is now blocking: `lint` and `test` no longer run with `continue-on-error`; the keychain round-trip test skips at runtime where no OS keychain is available, TTY-dependent login tests force a TTY, and the orphaned `cli/test/generation/` suite (tested a code generator that lives upstream) was removed (ADR 0006).
- Added `node:test` suites for `@freeclimb/core` (validation, PerCL generate/validate, dashboard presets) and `@freeclimb/mcp` (tool definitions, MCP Apps UI). The MCP suite pins the read-only tool surface from ADR 0005 — adding a mutating tool now fails a test.
- Fixed all 161 lint errors across the CLI workspace; `unicorn/prefer-event-target` is disabled by config (EventEmitter is idiomatic for the tunnel/proxy).
- Added `hooks/freeclimb-cli-guard.mjs` (`beforeShellExecution`): billable or irreversible FreeClimb CLI commands without `--dry-run` require explicit approval instead of running unattended (ADR 0007).
- Added `scripts/scan-secrets.mjs` to CI and `npm run validate`: fails if Account-ID- or API-key-shaped values appear in tracked files.
- `scripts/validate-plugin.mjs` now validates YAML frontmatter on every skill, rule, agent, and command.
- `rules/freeclimb.mdc` is now `alwaysApply: true` and is the canonical guardrail source; agents and commands reference it instead of restating guardrails. Fixed guardrail drift: the removed "destructive-action hook" reference in `/freeclimb-test-flow`, the pre-browser-login credential wording in `/build-freeclimb-phone-workflow`, and the onboarding skill's claim that MCP tools can spend money (stale since ADR 0005).
- Updated README and the security architecture review for the new hooks, secret scan, and test coverage.

## 0.2.0

- Consolidated the plugin and CLI into an npm-workspace monorepo (`core/`, `mcp/`, `cli/`) with a standalone stdio MCP server and first-run onboarding (ADR 0001–0004).
- Made the MCP surface read-only; all billable/mutating actions route through the CLI (ADR 0005).
- Keyring-only credentials via the local browser login flow or `freeclimb login`.

## 0.1.0

- Initial local plugin: four skills, one rule, one agent, one command, MCP config pointing at a local CLI checkout.
