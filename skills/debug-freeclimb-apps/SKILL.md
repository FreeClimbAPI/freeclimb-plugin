---
name: debug-freeclimb-apps
description: Troubleshoot FreeClimb demo apps, webhooks, calls, SMS, logs, trial-account limits, and local tunnel issues.
---

# Debug FreeClimb Apps

Use this skill when a FreeClimb call, SMS, webhook, MCP tool, or local demo does not work.

## First Checks

1. Confirm the CLI is authenticated:

```bash
freeclimb diagnose
```

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
- MCP tool fails: run the equivalent `freeclimb` CLI command to isolate credentials vs MCP.

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
