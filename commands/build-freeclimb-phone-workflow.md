---
name: build-freeclimb-phone-workflow
description: Build a demo FreeClimb phone workflow from a business prompt.
argument-hint: [business goal]
---

# /build-freeclimb-phone-workflow

Build a local FreeClimb voice workflow from a business request.

## Default Goal

If no argument is provided, use:

```text
Create a simple FreeClimb support line for a small business. When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail.
```

## Workflow

1. Load the `freeclimb-concepts`, `percl-call-control`, and `build-a-phone-workflow` skills.
2. Restate the requested phone workflow in business language.
3. Create a minimal local Express webhook app with `/voice`, `/menu`, `/sales`, `/support`, `/voicemail`, `/voicemail-saved`, and `/health`.
4. Use valid PerCL JSON arrays in every voice route.
5. Tell the user how to run the app locally.
6. Use `freeclimb dev --port 3000` when the user is ready to connect the app to FreeClimb. If `freeclimb` is not globally installed, use `node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run dev --port 3000`.
7. After the user calls the number, use FreeClimb MCP or CLI commands to list calls and logs.

## Guardrails

- Do not expose Account IDs, API keys, or phone numbers in files unless the user explicitly asks.
- Do not buy, delete, or reassign numbers without explicit user confirmation.
- On trial accounts, remind the user that outbound calls and SMS require verified destination numbers.
