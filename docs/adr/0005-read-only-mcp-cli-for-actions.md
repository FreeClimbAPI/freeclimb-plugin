# 5. Read-only MCP, CLI for actions

Status: Accepted

Supersedes the MCP capability scope of ADR 0004 (which expanded the MCP surface to include provisioning/mutating tools such as `create_application`, `update_application`, and `buy_number`).

## Context

ADR 0004 made the standalone MCP server the primary agent surface and grew it to include billable and account-changing tools (`make_call`, `send_sms`, `buy_number`, `update_call`, `create_application`, `update_application`). Because MCP tools are auto-executing from the agent's perspective, this put billable capability directly behind model-supplied arguments. The only gate was a bespoke `beforeMCPExecution` confirm/destination-allowlist hook (`freeclimb-mcp-guard.sh` → `freeclimb-destructive-guard.mjs`, `FREECLIMB_ALLOWED_DESTINATIONS`). The security architecture review flagged this as finding F1 (agent-initiated billable/irreversible actions): a stateless hook is easy to misjudge in review, and prompt-injection reaching the agent (for example via an inbound SMS body returned by `list_sms` or a log line from `filter_logs`) could trigger real spend.

The FreeClimb CLI already exposes every one of these operations, is agent-friendly (structured JSON output, `--dry-run`, input validation), and is invoked as a terminal command — a surface that Cursor's command-execution approval/allowlist Run Mode already governs.

## Decision

Make the MCP surface strictly read-only and route all mutations through the CLI.

- Remove the six mutating tools (`make_call`, `send_sms`, `buy_number`, `update_call`, `create_application`, `update_application`) and the `send-sms`/`make-call` prompts from the MCP server (`mcp/src/tools.ts`, `mcp/src/server.ts`). The MCP keeps inspection tools (calls, SMS, numbers, applications, account, logs, recordings, conferences, queues) and local PerCL/dashboard helpers (`generate_percl`, `validate_percl`, `generate_dashboard_prompt`, `render_dashboard`). `filter_logs` stays — it is a read-only PQL query that happens to use POST.
- The agent retains full capability: it performs actions by running the CLI (`freeclimb calls:make`, `sms:send`, `calls:update`, `incoming-numbers:buy`, `applications:create`/`update`), always with `--dry-run` first.
- Remove the now-obsolete `beforeMCPExecution` guard and `FREECLIMB_ALLOWED_DESTINATIONS`; `hooks/hooks.json` declares only the `sessionStart` hook.
- Authentication is unchanged: both surfaces read the same full-access API key from the OS keyring via `@freeclimb/core`; both login paths (`node mcp/lib/bin.js login` and `freeclimb login`) remain.

## Consequences

- Resolves/reframes security finding F1: the auto-executing MCP surface can no longer place calls, send SMS, buy numbers, or modify calls/applications. Prompt-injection that reaches the agent cannot trigger a billable MCP tool.
- The enforcement point for billable actions moves from a bespoke MCP hook to two stronger, host-level controls: Cursor command-execution approvals/allowlist (Run Mode) and the CLI's `--dry-run`/validation. The review story simplifies to "MCP = read-only; all writes go through the approved-command CLI path."
- Residual risk is explicit and accepted: the agent can still initiate billable actions via the CLI. The win is a single, governable, auditable action surface rather than billable capability spread across MCP tools.
- Reduces the auto-running-script trust surface (F6) to one read-only `sessionStart` hook.
- FreeClimb issues a single full-access API key per account (no read-only key), so the read-only property is enforced at the MCP tool layer, not the credential layer; a leaked key remains full-access regardless.

## Alternatives considered

- Keep mutating MCP tools behind the `beforeMCPExecution` confirm/allowlist hook (ADR 0004 + F1 mitigation): rejected; a stateless per-call hook is weaker and harder to review than removing the capability, and it duplicates the host's command-approval controls.
- Replace mutating tools with read-only "handoff" tools that return the exact CLI command instead of calling the API: rejected for v1 as unnecessary indirection; the agent can construct CLI commands directly from the documented mappings.
- Scope MCP credentials to read-only: not possible — FreeClimb has no read-only API key.
