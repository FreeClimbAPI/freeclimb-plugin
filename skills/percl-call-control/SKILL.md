---
name: percl-call-control
description: Build valid PerCL JSON for FreeClimb call flows including greetings, menus, voicemail, transfers, queues, and recordings.
---

# PerCL Call Control

Use this skill when creating or reviewing webhook responses for FreeClimb voice applications.

PerCL is a JSON array of command objects returned by a webhook server. FreeClimb executes the commands in order.

Guardrails: follow `rules/freeclimb.mdc` (canonical).

For exact PerCL command syntax and parameters, use MCP resource `freeclimb://skills/freeclimb-percl-reference`.

Generate starter PerCL with the `generate_percl` MCP tool (patterns: greeting, menu, voicemail, transfer, queue, record, play, speech, conference) and validate any PerCL array with the `validate_percl` MCP tool before deploying or making a test call.

## Common Commands

### Say

Speaks text to the caller.

```json
[{ "Say": { "text": "Thanks for calling. How can we help?" } }]
```

### GetDigits

Collects keypad input and posts the result to an `actionUrl`.

```json
[
  {
    "GetDigits": {
      "actionUrl": "https://example.com/menu",
      "prompts": [
        { "Say": { "text": "Press 1 for sales. Press 2 for support." } }
      ],
      "maxDigits": 1,
      "minDigits": 1,
      "initialTimeoutMs": 8000,
      "flushBuffer": true
    }
  }
]
```

### RecordUtterance

Records a voicemail-style message.

```json
[
  { "Say": { "text": "Please leave a message after the beep." } },
  {
    "RecordUtterance": {
      "actionUrl": "https://example.com/voicemail-saved",
      "silenceTimeoutMs": 5000,
      "maxLengthSec": 120,
      "finishOnKey": "#",
      "playBeep": true
    }
  }
]
```

### Redirect

Moves the call to another webhook endpoint.

```json
[{ "Redirect": { "actionUrl": "https://example.com/support" } }]
```

### Hangup

Ends the call.

```json
[{ "Hangup": {} }]
```

## Additional Commands

### PlayEarlyMedia

Play audio before the call is answered. Only valid in the initial `voiceUrl` PerCL for an inbound call; cannot nest inside other commands.

### Reject

Decline an inbound call without answering or billing. Must be the first command in the initial `voiceUrl` response; otherwise FreeClimb ignores it silently.

### privacyMode

Set `privacyMode: true` on `Say`, `Play`, `GetDigits`, `GetSpeech`, `SendDigits`, or `OutDial` to suppress sensitive values in FreeClimb logs (PCI). Per-command; does not inherit to nested prompts.

### Conference callControl

In `AddToConference`, set `allowCallControl: true`, `callControlSequence` (DTMF digits including `*`/`#`), and `callControlUrl`. When a participant enters the sequence, FreeClimb POSTs a `callControl` webhook (`requestType: callControl`, `digits` field) and expects valid PerCL back.

### Redirect limit

A call allows at most 256 `Redirect` commands over its lifetime; exceeding this terminates the call with `maxRedirectsError` (log error 14).

### Validator coverage

`validate_percl` accepts `TranscribeUtterance` and `SetDTMFPassThrough` as valid commands — use it before deploying flows that include them.

## Demo IVR Pattern

Use this pattern for the live support-line demo:

- `/voice`: greet caller and collect one digit.
- `/menu`: route digit `1` to sales, digit `2` to support, everything else to voicemail.
- `/sales`: say a short sales message, then hang up or redirect.
- `/support`: say a short support message, then hang up or redirect.
- `/voicemail`: record the caller's message.
- `/voicemail-saved`: thank caller and hang up.

Keep webhook responses fast. Do long-running work after acknowledging the webhook.
