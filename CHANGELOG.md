# Changelog

## Unreleased

- Added shared API request pacing in `@freeclimb/core`: 5 request starts per second, at most 2 concurrent requests per process, adaptive `Retry-After` handling on HTTP 429, and no automatic retries for POST/PATCH/DELETE. Override with `FREECLIMB_REQUESTS_PER_SECOND`, `FREECLIMB_MAX_CONCURRENT_REQUESTS`, and `FREECLIMB_MAX_RETRIES`.
- Prevented overlapping dashboard refresh ticks so polling dashboards do not stack concurrent fetches.
- Deepened module seams and hardened validation across `@freeclimb/core`, `@freeclimb/mcp`, and `freeclimb-cli`.
- Fixed browser login so the loopback process exits after success and no longer prints the Account ID.
- Fixed plugin MCP startup to resolve the bundled server from `${CURSOR_PLUGIN_ROOT}` instead of the process working directory.
- Isolated core and CLI test keyrings so running the suite on an authenticated machine cannot read or overwrite the real FreeClimb credentials.
- Fixed filtered log requests to send only the API-supported PQL body and apply result limits locally.
- Added a privacy-safe onsite operations dashboard that shows account health, call counts, and error counts without exposing identifiers, phone numbers, message bodies, or log text.
- Added a FreeClimb dashboard skill and constrained MCP App renderer for privacy-safe, manually refreshed in-IDE snapshots.
- Added `.cursor-plugin/marketplace.json` for team-marketplace import.
- CI and development now require Node.js 22 (pnpm 11.5.3 minimum).
- Updated dependencies: `actions/setup-node` v7, `pnpm/action-setup` v6, `@types/node` 26, `nock` 14, `chalk` 5, `ink` 7, `nyc` 18.

## 0.5.0 — 2026-07-21

- Added shared API request pacing and adaptive 429 handling in `@freeclimb/core` (see Unreleased notes above).
- Deepened module seams and hardened validation across core, CLI, and MCP.
- Hardened onboarding and added in-IDE privacy-safe operations dashboards.
- CI and development standardized on Node.js 22.

## 0.4.0 — 2026-07-06

- Migrated the monorepo from npm workspaces to pnpm 11.5.3 with `pnpm-workspace.yaml`, `workspace:*` internal links, and Corepack-pinned installs in CI and onboarding (ADR 0008).
- Added a single core REST resources seam in `@freeclimb/core` (`core/src/resources.ts`): typed read functions plus a `readResources` registry keyed by dashboard source name. MCP, CLI dashboard, `status`, and dev tooling now share one path/param/response implementation instead of hand-built duplicates (ADR 0009).
- Consolidated HTTP client usage on the core `apiRequest`/`publicRequest` seam; moved dashboard polling data into `core/src/dashboard/data.ts` with the CLI Ink renderer and MCP dashboard tools as thin adapters.
- Collapsed the MCP server to protocol glue with a typed handler table over the core read seam; CLI resource commands converted to thin oclif stubs over a deep `executor.ts` pipeline.
- Added four skills: `sms-compliance`, `webhook-security`, `freeclimb-incident-triage`, and `conferences-queues-recordings`.
- Added `rules/sms-compliance.mdc` for SMS opt-out, consent, quiet hours, and 10DLC guardrails.
- Added `hooks/freeclimb-percl-guard.mjs` (`afterFileEdit`): validates `.percl.json` files on save via the core PerCL validator.
- Added `/freeclimb-status` command for a one-shot read-only account health check.
- Removed vestigial paths and stale references from earlier layout experiments.

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
