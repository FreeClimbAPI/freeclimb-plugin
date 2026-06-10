---
name: percl-call-control
description: Build valid PerCL JSON for FreeClimb call flows including greetings, menus, voicemail, transfers, queues, and recordings.
---

# PerCL Call Control

Use this skill when creating or reviewing webhook responses for FreeClimb voice applications.

PerCL is a JSON array of command objects returned by a webhook server. FreeClimb executes the commands in order.

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

## Demo IVR Pattern

Use this pattern for the live support-line demo:

- `/voice`: greet caller and collect one digit.
- `/menu`: route digit `1` to sales, digit `2` to support, everything else to voicemail.
- `/sales`: say a short sales message, then hang up or redirect.
- `/support`: say a short support message, then hang up or redirect.
- `/voicemail`: record the caller's message.
- `/voicemail-saved`: thank caller and hang up.

Keep webhook responses fast. Do long-running work after acknowledging the webhook.
