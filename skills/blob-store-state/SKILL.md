---
name: blob-store-state
description: Use when persisting ephemeral JSON call or IVR state across webhook requests without provisioning a database.
---

# Blob Store State

Use this skill to carry caller context between PerCL webhook hops (menu depth, collected fields, session flags).

Guardrails: follow `rules/freeclimb.mdc` (canonical). **Never store credentials, API keys, or raw PII** in blobs—use opaque IDs and server-side lookups instead.

Feature may require FreeClimb support to enable on the account before first use.

## Core Workflow (IVR state pattern)

1. First webhook (`inbound`): `POST /Blobs` with `alias` = `callId` (or conversation id) and initial JSON state; store the returned `blobId` alongside your session (or derive it later by listing and matching `alias`).
2. Each later webhook: `GET /Blobs/{blobId}` to read state.
3. Update with `PATCH /Blobs/{blobId}` (merge fields) or `PUT` (replace entire object).
4. On call completion: `DELETE /Blobs/{blobId}` or delete specific keys via `?key=`.

```json
{
  "alias": "CA1234567890abcdef",
  "blob": { "menuLevel": "main", "accountRef": "opaque-id-42" }
}
```

CLI: `freeclimb blobs:list`, `blobs:get <blobId>`, `blobs:create --data '{...}'`, `blobs:modify <blobId> --data '{...}'` (PATCH merge), `blobs:replace <blobId> --data '{...}'` (PUT), `blobs:delete <blobId>`—use `--dry-run` on writes.

For ad-hoc access: `freeclimb api /Blobs --method POST -d '{...}' --dry-run`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/Accounts/{accountId}/Blobs` | Create blob |
| GET | `/Accounts/{accountId}/Blobs` | List blobs |
| GET | `/Accounts/{accountId}/Blobs/{blobId}` | Retrieve by ID |
| PATCH | `/Accounts/{accountId}/Blobs/{blobId}` | Merge/update fields |
| PUT | `/Accounts/{accountId}/Blobs/{blobId}` | Replace entire blob |
| DELETE | `/Accounts/{accountId}/Blobs/{blobId}` | Delete blob or keys (`?key=field`) |

## Key Parameters and Limits

| Constraint | Value |
|------------|-------|
| Max size per blob | **512 KiB** |
| Max total storage per account | **10 MiB** |
| Default expiration | **9 hours** from creation |
| Max expiration (`expiresAt`) | **48 hours** |
| Content format | Top-level JSON object `{}` |
| Key characters | Letters, numbers, hyphens, underscores |
| Alias | Unique per account |

`revision` increments on each update—useful for optimistic concurrency checks.

## Webhooks Involved

Blob Store is accessed via REST from your webhook server—it does not emit its own FreeClimb webhook `requestType`. Read/write during normal voice/SMS webhook handlers.

## Pitfalls

- Blobs are **ephemeral**—do not use as a system of record; export to your DB before expiry.
- Race conditions on concurrent PATCHes from parallel webhooks—prefer `callId` alias and idempotent merges.
- Contact support if account returns errors before first blob—feature may not be enabled.
- Large payloads (>512 KiB) fail; keep state minimal (IDs and enums, not full transcripts).

## References

- https://docs.freeclimb.com/docs/get-started-with-the-blob-store
- https://docs.freeclimb.com/reference/blobs
