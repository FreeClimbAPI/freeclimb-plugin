---
name: webhook-security
description: Secure FreeClimb webhook endpoints - request signature verification, HTTPS-only hygiene, tunnel safety, and secrets handling.
---

# Webhook Security

Use this skill when building, reviewing, or hardening a FreeClimb webhook server (`voiceUrl`, `smsUrl`, `callConnectUrl`, `statusCallbackUrl`, and their fallback variants).

A FreeClimb webhook is a public HTTP endpoint. Anyone who finds the URL can send it a fake request unless it verifies that requests genuinely come from FreeClimb.

## Verify Requests Come From FreeClimb

FreeClimb signs webhook requests; check the platform docs (https://docs.freeclimb.com) for the current signature header and verification algorithm, and implement that check before trusting any webhook payload. If the signing mechanism isn't already documented in this repo, treat "verify the signature per FreeClimb's docs" as a requirement to research and implement, not something to skip.

Until signature verification is in place, apply defense-in-depth so a forged request can't do real damage:

- Reject anything that isn't a `POST`.
- Validate the shape of expected fields — `callId` starts with `CA`, `accountId` starts with `AC`, phone numbers are E.164 — and reject malformed payloads rather than trusting them blindly.
- Treat webhook input as adversarial: don't interpolate it into shell commands, file paths, or raw SQL.
- Rate limit webhook routes so a flood of forged requests can't exhaust your server or downstream APIs.
- Never echo secrets (API keys, Account IDs, session tokens) into logs, error responses, or the PerCL you return — a leaked log line is as bad as a leaked credential.

## HTTPS-Only Is a Hard Guardrail

Every `actionUrl` and webhook URL must be an absolute, publicly reachable HTTPS URL — this is already a canonical guardrail in `rules/freeclimb.mdc`. Relative paths and `localhost` fail silently, and plain HTTP exposes call/SMS content and signing headers in transit. Don't relax this for "just testing" — use a tunnel instead (see below).

## Tunnel Hygiene for Local Development

Tunnels (ngrok, cloudflared, `freeclimb dev`) expose your local machine to the public internet. Treat every tunnel URL as short-lived and semi-public:

- Don't commit tunnel URLs to source control, tickets, or shared docs — they change on every restart and can be used to hit your dev machine while live.
- Rotate/restart the tunnel after a demo so an old, forgotten URL doesn't stay reachable.
- Don't leave a tunnel running unattended pointed at a server with real credentials or production data behind it.
- Re-point the Application's webhook URLs (or use `freeclimb dev`, which does this automatically) whenever the tunnel URL changes — a stale URL means requests silently stop arriving, not a security issue by itself, but worth checking when debugging.

## Secrets Handling

- Never put Account IDs, API keys, or other credentials in a webhook query string — query strings end up in access logs, browser history (if ever opened manually), and reverse-proxy logs.
- Never put FreeClimb credentials in webhook route code, `.mcp.json`, or committed config; per `rules/freeclimb.mdc`, credentials live only in the OS keyring via the browser login flow.
- If a webhook needs to call back into your own systems with a secret, pass it via a header or server-side lookup keyed by `callId`/`accountId`, not an embedded query parameter.

## Review Checklist

When reviewing a webhook server for security:

1. Does it verify the request came from FreeClimb (signature check), or at minimum validate expected field shapes?
2. Does it reject non-POST methods?
3. Are all configured URLs absolute HTTPS (no `localhost`, no relative paths)?
4. Is there rate limiting on public routes?
5. Do logs and error responses avoid echoing secrets or full request bodies containing PII?
6. Are tunnel URLs absent from committed files?
7. Are credentials read only from environment/keyring, never hardcoded or query-string-embedded?
