---
name: mms-messaging
description: Use when sending, reviewing, or troubleshooting MMS with media attachments via the Messages API or during a call-context SMS workflow.
---

# MMS Messaging

Use this skill when a workflow needs picture, audio, or video attachments—not plain SMS text alone.

Guardrails: follow `rules/freeclimb.mdc` (canonical). For consent, opt-out, and 10DLC, also apply `skills/sms-compliance/SKILL.md` before any outbound send.

MMS is REST-only today: attach media via **Send a Message** (`POST /Accounts/{accountId}/Messages`). PerCL `Sms` supports `to`, `from`, `text`, and `notificationUrl` only—no `mediaUrls`.

## Core Workflow

1. Confirm A2P/10DLC registration is complete; docs state MMS is available only for registered A2P traffic.
2. Host each attachment at a **public HTTPS URL** carriers can fetch (same hygiene as webhook URLs).
3. Send with `text` plus optional `mediaUrls` (array of URL strings).
4. Set `notificationUrl` on the request if you need outbound status callbacks.
5. For billable sends, use CLI `--dry-run` and confirm with the user first.

```bash
freeclimb sms:send +1FROM +1TO "Your photo is attached" --dry-run
freeclimb api /Messages --method POST \
  -d '{"from":"+1FROM","to":"+1TO","text":"Caption","mediaUrls":["https://example.com/image.jpg"]}' \
  --dry-run
```

PerCL during a call (text SMS only):

```json
[{ "Sms": { "to": "+15551234567", "from": "+15559876543", "text": "Reply STOP to opt out.", "notificationUrl": "https://example.com/message-status" } }]
```

Inspect delivery with MCP `list_sms` / `get_sms` (read-only).

## Key Parameters and Limits

| Item | Limit / note |
|------|----------------|
| `mediaUrls` | Max **5** URLs per message |
| `text` | Required; cannot be empty |
| MMS size (shortcode) | **500 KB** per file after base64/MM7 overhead (~30–40%) |
| SMS text in MMS | Up to **1000** characters/bytes per docs |
| Prerequisite | Registered A2P/10DLC traffic |
| Image MIME | `image/jpeg`, `image/png`, `image/gif`, `image/bmp` |
| Audio MIME | `audio/wav`, `audio/mp3`, `audio/amr`, `audio/aac`, others per docs |
| Video MIME | `video/3gpp`, `video/mp4`, `video/h.263`, others per docs |

## Webhooks Involved

| `requestType` | When | Response |
|---------------|------|----------|
| `messageStatus` | Outbound message status changes (`notificationUrl` on REST send or PerCL `Sms`) | PerCL ignored |
| `messageDelivery` | Inbound SMS/MMS hits the number's `smsUrl` | PerCL ignored |

Key `messageStatus` values: `queued`, `sending`, `sent`, `failed`, `rejected`, `expired`.

## Pitfalls

- Errors **103** (`MMSNotEnabledAccount`), **104** (`MMSNotEnabledNumber`), **105** (`MMSNonShortcode`) — MMS not enabled on account, number, or unsupported number type.
- Trial accounts: destinations must be verified; see `rules/freeclimb.mdc`.
- MIME types and handset support vary by carrier; test on real devices.
- Do not embed credentials or PII in media URLs or message bodies logged to chat.

## References

- https://docs.freeclimb.com/reference/send-a-message
- https://docs.freeclimb.com/reference/messaging
- https://docs.freeclimb.com/reference/messagestatus
- https://docs.freeclimb.com/reference/messagedelivery-1
- https://docs.freeclimb.com/reference/error-103
- https://docs.freeclimb.com/reference/error-104
- https://docs.freeclimb.com/reference/error-105
- https://docs.freeclimb.com/reference/sms-4
