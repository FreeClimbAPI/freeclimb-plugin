---
name: webhook-security
description: Secure FreeClimb webhook endpoints - request signature verification, HTTPS-only hygiene, tunnel safety, and secrets handling.
---

# Webhook Security

Use this skill when building, reviewing, or hardening a FreeClimb webhook server (`voiceUrl`, `smsUrl`, `callConnectUrl`, `statusCallbackUrl`, and their fallback variants).

A FreeClimb webhook is a public HTTP endpoint. Anyone who finds the URL can send it a fake request unless it verifies that requests genuinely come from FreeClimb.

## Verify the FreeClimb-Signature Header

FreeClimb signs every webhook with a `FreeClimb-Signature` header. FreeClimb documents no IP allowlist — signature verification is the only supported source authentication.

Header format: `t=<unix_timestamp>,v1=<hmac_hex>`. When two signing secrets are active during rotation, the header carries multiple `v1=` entries (one per secret).

Verification algorithm:

1. Parse the header on `,` into key/value pairs; extract `t` and every `v1`.
2. Reject requests whose timestamp differs from now by more than ~5 minutes (recommended tolerance).
3. Compute HMAC-SHA256 over `"{timestamp}.{rawBody}"` using your signing secret; compare hex output to each `v1`.

Signing secrets are dashboard-managed only (Account > API Credentials); there is no REST API to create or rotate them. Accounts may hold at most 2 active secrets for zero-downtime rotation — delete the old secret after all apps are updated.

Pinned SDK behavior:

| SDK | Version | Built-in helper |
|-----|---------|-----------------|
| Node.js | 4.4.1 | `RequestVerifier.verifyRequestSignature` |
| Python | 5.4.1 | `RequestVerifier.verify_request_signature` |
| Java | 6.4.1 | `RequestVerifier.verifyRequestSignature` |
| C# / .NET | 5.4.1 | `RequestVerifier.verifyRequestSignature` |
| Ruby | 5.5.1 | `Freeclimb::RequestVerifier.verify_request_signature` |
| PHP | 5.4.1 | `RequestVerifier::verifyRequestSignature` |

Do not use those helpers directly at the pinned versions. Their defaults use milliseconds against second-based timestamps, they do not reject future timestamps, and they do not use constant-time comparisons. Ruby also depends on undeclared ActiveSupport behavior, while PHP 5.4.1 passes the request header where the signing secret is required.

Use the hardened implementation in the matching starter template. It follows the documented algorithm, enforces absolute timestamp skew of at most 300 seconds, checks every `v1`, and compares digest bytes in constant time.

Use the raw request body (not re-serialized JSON) when verifying. Until verification is wired, apply defense-in-depth so a forged request can't do real damage:

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
