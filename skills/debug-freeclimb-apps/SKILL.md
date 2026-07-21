---
name: debug-freeclimb-apps
description: Troubleshoot FreeClimb demo apps, webhooks, calls, SMS, logs, trial-account limits, and local tunnel issues.
---

# Debug FreeClimb Apps

Use this skill when a FreeClimb call, SMS, webhook, MCP tool, or local demo does not work.

Guardrails: follow `rules/freeclimb.mdc` (canonical).

For error codes and recovery patterns, use MCP resource `freeclimb://skills/freeclimb-error-recovery`.

## First Checks

1. Confirm the account is connected. With the MCP tools, call `get_account` (it fails if unauthenticated). With the CLI installed, run `freeclimb diagnose`. If neither works, run `/freeclimb-setup`.

2. Confirm the app server is running:

```bash
curl http://localhost:3000/health
```

3. Confirm a tunnel or `freeclimb dev` session is running.

4. Confirm the FreeClimb number is assigned to the intended Application.

5. Confirm the Application `voiceUrl` points at the current tunnel URL.

## Trial Account Checks

Trial accounts can only send outbound calls or SMS to verified numbers. If outbound actions fail during the demo, use the pre-verified cell number.

Inbound calls to an owned FreeClimb number are usually the most reliable trial-account demo path.

## Common Failures

- No call reaches the app: check number assignment and `voiceUrl`.
- Caller hears nothing: check server logs and confirm routes return valid JSON arrays.
- Menu input fails: check `GetDigits.actionUrl` and Express URL-encoded body parsing.
- Outbound SMS/call fails: verify destination number on trial account.
- PerCL step dies after the first prompt: an `actionUrl` is relative or points at `localhost`. Run `validate_percl` and rebuild URLs from the public base.
- MCP tool fails on auth: re-run login per `rules/freeclimb.mdc`; if the CLI is installed, `freeclimb diagnose` isolates credentials vs MCP.
- Call ends after first prompt with no app error: check `get_call` for `callEndedReason` of `webhookFailed` (could not reach webhook) or `webhookInvalidResponse` (bad PerCL/response).
- Primary webhook unreachable: `voiceFallbackUrl`/`smsFallbackUrl` fire once when the primary `voiceUrl`/`smsUrl` times out or errors (voice fallback also on HTTP ≥400). They are a single alternate attempt, not a retry loop.

## Per-Call Logs

Scope logs to one call with GET `/Accounts/{accountId}/Calls/{callId}/Logs`, or the read-only MCP tool `list_call_logs` when available. Prefer this over account-wide `filter_logs` when you already have a `callId`.

## Useful Commands

```bash
freeclimb status
freeclimb incoming-numbers:list --fields phoneNumberId,phoneNumber,applicationId --json
freeclimb applications:list --fields applicationId,alias,voiceUrl,smsUrl --json
freeclimb calls:list --fields callId,status,from,to,dateCreated --json
freeclimb logs:filter --pql 'level = "ERROR"' --json
```

## Agent Response Pattern

When debugging, explain findings in business language first:

- "The phone number is not connected to the app."
- "The app is not reachable from FreeClimb."
- "The trial account cannot call that unverified number."

Then give the exact command or fix.
