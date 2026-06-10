---
name: freeclimb-concepts
description: Understand FreeClimb accounts, applications, numbers, webhooks, calls, SMS, and trial-account limits before building voice or messaging workflows.
---

# FreeClimb Concepts

Use this skill whenever a user asks to build, explain, configure, or troubleshoot a FreeClimb voice or SMS workflow.

## Core Model

FreeClimb is a programmable communications platform for voice and SMS.

The most important resources are:

- **Account**: The FreeClimb customer account. API authentication uses Account ID plus API Key.
- **Application**: A webhook configuration. It tells FreeClimb where to send call and SMS events.
- **Phone number**: An owned FreeClimb number that can receive calls/SMS and be assigned to an Application.
- **Call**: A voice connection.
- **Message**: An SMS message.
- **Log**: Operational records useful for debugging calls, SMS, and webhooks.

## How Incoming Calls Work

1. A caller dials a FreeClimb number.
2. The number is assigned to a FreeClimb Application.
3. FreeClimb sends an HTTP POST to the Application's `voiceUrl`.
4. The user's app returns PerCL JSON.
5. FreeClimb executes the PerCL commands.
6. Commands can point to another `actionUrl`, creating a call flow.

## Trial Account Constraints

Trial accounts can only place outbound calls or send SMS to verified numbers. For live demos, pre-verify the presenter's cell number.

Inbound calls to a FreeClimb number are the safest centerpiece for a trial-account demo.

## Agent Guidance

Prefer business language first:

- "support line"
- "phone menu"
- "voicemail"
- "call transfer"
- "SMS confirmation"

Then map the request to FreeClimb resources:

- support line -> Application + phone number + webhook server
- phone menu -> `GetDigits`
- greeting -> `Say`
- voicemail -> `RecordUtterance`
- call transfer -> `OutDial`

Do not expose Account IDs, API keys, or secrets in generated files or presentation material.
