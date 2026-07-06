---
name: freeclimb-status
description: One-shot read-only account health check across calls, SMS, logs, and webhook configuration.
---

# /freeclimb-status

Give the user a quick, read-only picture of FreeClimb account health.

## Workflow

1. Delegate the data gathering to the `freeclimb-operator` subagent (read-only). Have it collect:
   - `get_account` for account standing and account type (trial vs paid).
   - Recent failed calls: `list_calls` filtered to `status=failed`, plus counts of `busy` and `noAnswer` outcomes over the same recent window.
   - Recent SMS failures: `list_sms` and check delivery statuses for failures.
   - Error-level logs: `filter_logs` with a PQL filter of `level = "ERROR"`, most recent ~100 entries.
   - Webhook misconfigurations: `list_applications` and flag any application with a missing `voiceUrl`/`smsUrl` or one that is not an absolute `https://` URL.
2. If the FreeClimb MCP tools are unavailable, tell the user to run `/freeclimb-setup` and stop.
3. Synthesize the results into a concise health summary:
   - A verdict: **healthy**, **degraded**, or **attention needed**.
   - Key numbers (failed/busy/no-answer call counts, SMS failure count, error-log count).
   - Top 2-3 recurring error signatures from the logs, in business language first.
   - Any applications with missing or non-HTTPS webhook URLs, called out by name.
   - If the account is a trial account, note that outbound calls/SMS require verified destination numbers and that this can look like failures.
4. Suggest next steps, referencing the `freeclimb-incident-triage` skill when the user wants to dig into a specific failure, or `/freeclimb-test-flow` when the issue looks like a PerCL/webhook problem.

## Guardrails

Follow the plugin rule `rules/freeclimb.mdc` — the canonical guardrail list.

- Everything in this command is read-only; never run a mutating or billable CLI command as part of a status check.
- Do not print full phone numbers, Account IDs, or API keys in the summary; reference resources by their FreeClimb IDs where possible.
