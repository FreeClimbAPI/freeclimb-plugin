---
name: verify-flow
description: Validate and simulate a FreeClimb call/SMS flow before a live call - check PerCL, then exercise webhook routes with realistic FreeClimb request bodies to catch failures early.
---

# Verify A FreeClimb Flow

Use this skill before telling the user to place a live call or send a live SMS, and whenever a flow "works locally but fails on a real call." The goal is to surface failures during verification, not during the live demo.

Two phases: validate the PerCL, then simulate the webhook path end to end.

Guardrails: follow `rules/freeclimb.mdc` (canonical).

## Phase 1 - Validate PerCL

For every route that returns PerCL, validate the JSON before deploying:

- Pipe the exact array returned by each route to `freeclimb percl:validate - --json`, or validate a captured response file with `freeclimb percl:validate <path> --json`.
- Fix all `errors` before continuing. Validation exits nonzero for invalid output.
- Confirm every `actionUrl` and webhook URL uses the public base URL (tunnel/deploy), not `localhost`.

Standalone `.percl.json` files are also checked automatically after agent writes. The CLI remains the explicit validation interface for runtime route output.

## Phase 2 - Simulate the webhook path

FreeClimb drives your app by POSTing form-encoded bodies and following each `actionUrl`. Reproduce that path with the public base URL (the `freeclimb dev` tunnel URL or deploy URL), not `localhost`:

```bash
BASE="<tunnelOrDeployUrl>"

# Inbound call hits voiceUrl
curl -s -X POST "$BASE/voice" -H 'content-type: application/x-www-form-urlencoded' \
  -d 'callId=CAtest&from=%2B15551112222&to=%2B15553334444&callStatus=ringing' \
  -w '\n[HTTP %{http_code}]\n'

# Each menu branch (GetDigits posts `digits` to actionUrl)
for d in 1 2 9; do
  curl -s -X POST "$BASE/menu" -H 'content-type: application/x-www-form-urlencoded' \
    -d "callId=CAtest&digits=$d" -w "\n[digits=$d HTTP %{http_code}]\n"
done
```

For SMS apps, simulate the inbound message FreeClimb posts to `smsUrl`:

```bash
curl -s -X POST "$BASE/sms-inbound" -H 'content-type: application/x-www-form-urlencoded' \
  -d 'from=%2B15551112222&to=%2B15553334444&text=HELP' -w '\n[HTTP %{http_code}]\n'
```

## Pass criteria

Only invite the user to call/text live when:

- Every simulated route returns HTTP 200.
- The `/voice` (or `smsUrl`) response contains absolute `actionUrl`s on the public domain, not `localhost`.
- Each branch routes to the intended next step (1→sales, 2→support, other→voicemail; STOP→opt-out, HELP→help for SMS).
- `freeclimb percl:validate` exits successfully for every serialized PerCL response.

## After the live call

Use the FreeClimb MCP read tools (`list_calls`, `get_call`, `list_logs`, `filter_logs` with `level = "ERROR"`) to confirm the call connected and inspect any failures.
