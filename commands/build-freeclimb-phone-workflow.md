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

1. Load the `freeclimb-concepts`, `percl-call-control`, `build-a-phone-workflow`, and `verify-flow` skills.
2. Restate the requested phone workflow in business language.
3. Create a minimal local Express webhook app with `/voice`, `/menu`, `/sales`, `/support`, `/voicemail`, `/voicemail-saved`, and `/health` (add `/sms-inbound` with STOP/HELP handling for SMS workflows).
4. Use valid PerCL JSON arrays in every voice/SMS route; validate them with the `validate_percl` MCP tool.
5. Tell the user how to run the app locally.
6. Use `freeclimb dev --port 3000` when the user is ready to connect the app to FreeClimb. If the MCP tools are unavailable, run `/freeclimb-setup` first to build the MCP server and connect the account.
7. Before inviting a live call, run `/freeclimb-test-flow` (validate PerCL + simulate the webhook path).
8. After the user calls the number, use the FreeClimb MCP read tools to list calls and logs.

## Guardrails

- Never request, display, paste, echo, or write Account IDs, API keys, or auth tokens in chat or in files. Credentials live only in the FreeClimb CLI keyring, set by the user via `freeclimb login` in their own terminal.
- Treat real phone numbers as sensitive; avoid printing them unless the user provides them for the task at hand.
- Do not buy, delete, or reassign numbers without explicit user confirmation.
- On trial accounts, remind the user that outbound calls and SMS require verified destination numbers.
