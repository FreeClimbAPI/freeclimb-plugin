---
name: build-a-phone-workflow
description: Turn a business request into a practical FreeClimb voice or SMS workflow, especially a live demo IVR support line.
---

# Build A Phone Workflow

Use this skill when the user asks for a phone line, IVR, voicemail, call routing, SMS responder, appointment reminder, or similar communications workflow.

## Start With The Business Goal

Restate the user's request in simple terms:

- Who is calling or texting?
- What should happen first?
- What options should the caller have?
- What should happen when input is missing or invalid?
- Does the workflow need a live human, voicemail, SMS, or logging?

Avoid starting with MCP, CLI, or PerCL unless the user asks.

## Map To FreeClimb

Translate the request into:

- A local webhook app.
- One or more webhook routes.
- PerCL responses for each route.
- A FreeClimb Application pointing to the webhook URLs.
- A FreeClimb number assigned to the Application.

For local development, prefer `freeclimb dev` because it creates a tunnel, configures webhook URLs, and can assign a number.

## Make Webhook URLs Publicly Reachable

FreeClimb requires every PerCL `actionUrl` to be an absolute, publicly reachable URL. Relative paths and `localhost` URLs fail silently: the caller hears the first greeting, then the menu or recording step dies because FreeClimb cannot reach the next route.

Build the app so it constructs absolute URLs from a configurable public base instead of hardcoding `localhost`:

- Read a base URL from an environment variable (for example `BASE_URL`), defaulting to `http://localhost:PORT` only for local checks.
- Build every `actionUrl` as `${BASE_URL}/route`.
- When running with `freeclimb dev`, set `BASE_URL` to the tunnel URL it prints (the `tunnelUrl` in the ready event), then start the app:

```bash
BASE_URL='<tunnelUrl>' PORT=3000 npm start
```

`freeclimb dev` points the Application `voiceUrl` at `<tunnel>/voice`, so the app must serve `/voice` and emit matching absolute `actionUrl`s for the remaining routes. The tunnel URL changes each restart, so re-set `BASE_URL` whenever you restart `freeclimb dev`.

## Demo Support Line

For the live demo, build this flow:

1. `/voice`: greet caller and ask for one digit.
2. `/menu`: route `1` to sales, `2` to support, and anything else to voicemail.
3. `/sales`: explain that sales will follow up and hang up.
4. `/support`: explain that support will follow up and hang up.
5. `/voicemail`: record a message.
6. `/voicemail-saved`: thank caller and hang up.
7. `/health`: return JSON so local checks are easy.

Use Express for the simplest Node.js demo app unless the current project already uses another web framework.

## Demo Script

Use this prompt:

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

## Safety

Use `--dry-run` before destructive or paid actions when available. Confirm with the user before buying numbers, deleting resources, or exposing secrets.
