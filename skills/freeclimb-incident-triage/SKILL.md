---
name: freeclimb-incident-triage
description: Triage FreeClimb production incidents by correlating logs with call/SMS records, recognizing common failure signatures, and producing an incident summary.
---

# FreeClimb Incident Triage

Use this skill when a user reports a production FreeClimb problem — calls dropping, SMS not arriving, a spike in failures — and asks for a diagnosis rather than a single lookup.

Use the MCP tools for every read in this runbook. Reach for the CLI only for `freeclimb diagnose`/`freeclimb status` or to hand the user a support-ready command; the MCP surface is read-only and cannot change the account.

## Triage Runbook

1. **Account standing.** Call `get_account` first. A suspended, unpaid, or degraded account explains everything else — stop here and surface it if so.
2. **Scope the incident.** Get the affected `callId`/`messageId` (or a time window) from the user. Use `get_call` / `get_sms` to pull the specific record(s): status, `from`/`to`, timestamps, `applicationId`.
3. **Correlate logs.** Use `filter_logs` with PQL scoped to the incident:
   - `callId = "CA..."` or `messageId = "SM..."` for a single incident.
   - `level = "ERROR"` combined with a time range for a spike.
   - Combine filters (e.g. `level = "ERROR" AND callId = "CA..."`) to narrow fast.
4. **Check the application config.** Use `get_application` on the relevant `applicationId` — a webhook URL that changed or points at a dead tunnel is one of the most common root causes.
5. **Check number assignment.** Use `list_numbers`/`get_number` to confirm the number is still assigned to the expected application.
6. **Widen if needed.** If the single-call trail doesn't explain it, use `list_calls`/`list_sms` filtered by status/time to see if it's an isolated incident or a pattern.

## Common Failure Signatures

| Signature | Evidence Pattern | Fix |
|-----------|-------------------|-----|
| Dead/unreachable `actionUrl` | Call connects, plays the first prompt, then drops; logs show a webhook timeout or connection error for the follow-up POST | Confirm the tunnel/server is up; `get_application` to check the URL is current and HTTPS; redeploy or re-tunnel |
| Invalid PerCL response | Logs show a parse/validation error right after a webhook POST; call ends abruptly after a route change | Pull the offending route's response and run `validate_percl` on it; fix the malformed command or bad `actionUrl` |
| Trial-account limits | Error codes 29 (unverified outbound number) or 76 (number limit reached) in logs; outbound call/SMS to a new number fails immediately | Verify the destination in the dashboard, or note the account needs to upgrade past trial |
| Rate limiting | Error code 24, or HTTP 429 in logs, clustered around a burst of requests | Confirm request volume/timing with the user; recommend backoff/spacing; this is not a code bug |
| Carrier-level failure | Call `status` is `busy`, `failed`, or `noAnswer` with no corresponding application-level error in logs | Not a FreeClimb-side bug; carrier/destination issue. Confirm the destination number is reachable and correctly formatted |

Cross-reference exact error codes against `cli/skills/platform/error-recovery.md` (surfaced via the MCP resource `freeclimb://skills/freeclimb-error-recovery`) when a log entry includes a numeric code.

## Escalation

- Run `freeclimb diagnose` (CLI) to confirm credentials/connectivity aren't the root cause before escalating further.
- Run `freeclimb status` (CLI) for a quick account-health snapshot to include in the summary.
- For anything that looks like a platform-side bug or requires account changes beyond read access, point the user to FreeClimb support (https://support.freeclimb.com) with the incident summary below attached.

## Incident Summary Template

Produce this after triage, filled in with what was actually found (omit sections with no evidence rather than guessing):

```markdown
## Incident Summary: <short title>

**Timeline**
- <timestamp> — <event, e.g. "call CA... connected">
- <timestamp> — <event, e.g. "webhook to actionUrl timed out">

**Blast Radius**
- Affected resource(s): <callId(s) / messageId(s) / number(s)>
- Estimated scope: <single call | N calls over window | ongoing>

**Root Cause Hypothesis**
<one or two sentences, e.g. "The application's voiceUrl points at a tunnel URL that expired after the last demo restart.">

**Evidence**
- `get_call CA...` -> status: <...>
- `filter_logs` (`callId = "CA..."`) -> <relevant log lines/errors>
- `get_application AP...` -> voiceUrl: <...>

**Remediation**
- <concrete next step, e.g. "Update the application's voiceUrl via `freeclimb applications:update` (with --dry-run first) and re-verify with a test call.">
```
