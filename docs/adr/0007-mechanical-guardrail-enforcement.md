# 7. Mechanical guardrail enforcement and a canonical rule

Status: Accepted

## Context

The plugin's guardrails (keyring-only credentials, read-only MCP vs CLI-for-actions, `--dry-run` before billable commands, trial-account verified-number limits) were restated in four places — `rules/freeclimb.mdc`, both agents, and the commands — with drift already visible: `commands/freeclimb-test-flow.md` referenced a "destructive-action hook" that ADR 0005 removed, `commands/build-freeclimb-phone-workflow.md` described `freeclimb login` as the only credential path (predating the browser login flow), and the onboarding skill still warned that "MCP tools can spend money" (false since ADR 0005). The rule also had `alwaysApply: false`, so the canonical guardrail text was skippable. Nothing enforced any of this mechanically: no hook watched CLI commands, no check stopped credential-shaped strings from landing in the repo, and the plugin validator did not check component frontmatter.

## Decision

Make `rules/freeclimb.mdc` the single source of truth and add three mechanical checks:

- Promote the rule to `alwaysApply: true` and drop the glob scoping. Agents, commands, and skills reference the rule for shared guardrails and keep only surface-specific additions (e.g. the operator's no-mutations handoff, the builder's demo constraints).
- Add `hooks/freeclimb-cli-guard.mjs` on `beforeShellExecution` (matcher `freeclimb\s`): billable or irreversible FreeClimb CLI commands (`calls:make`, `calls:update`, `sms:send`, `incoming-numbers:buy|delete|update`, `applications:create|update|delete`, `conference-participants:remove`, `recordings:delete`, and `api --method POST|PUT|DELETE`) without `--dry-run` return `permission: "ask"` instead of running unattended. The hook is read-only over its input and fails open to Cursor's own command approvals.
- Add `scripts/scan-secrets.mjs` to CI and `npm run validate`: fails if Account-ID-shaped (`AC` + 40 hex) or API-key-shaped (40 hex near "api key") values appear in tracked files, with an allowlist for the documented test placeholders.
- Extend `scripts/validate-plugin.mjs` to require frontmatter on every skill (`name`, `description`), rule (`description`, `alwaysApply`), agent (`name`, `description`, `model`, `readonly`), and command (`name`, `description`).

## Consequences

- Guardrail drift now has a place to be fixed once; prose duplication across components no longer needs to stay synchronized by hand.
- The dry-run guard complements, not replaces, Cursor's approval/allowlist Run Mode (ADR 0005's primary control). Users in `Run Everything` mode gain a safety net; users in `Allowlist` mode see one extra, more specific prompt.
- The secret scan is heuristic. It catches credential-shaped strings, not entropy-based secrets, and placeholder additions require updating the allowlist in `scripts/scan-secrets.mjs`.
- The hook expands the auto-running-script surface (security finding F6) by one script; it is input-read-only and side-effect-free by design.
