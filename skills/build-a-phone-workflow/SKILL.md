---
name: build-a-phone-workflow
description: Turn a business request into a practical FreeClimb voice or SMS workflow, especially a live demo IVR support line.
---

# Build A Phone Workflow

Use this skill when the user asks for a phone line, IVR, voicemail, call routing, SMS responder, appointment reminder, or similar communications workflow.

Guardrails: follow `rules/freeclimb.mdc` (canonical).

For voice application setup depth, use MCP resource `freeclimb://skills/freeclimb-voice-applications`.
For language and package selection, load `freeclimb-sdks` or MCP resource `freeclimb://skills/freeclimb-sdk-applications`.
For request verification, load `webhook-security`.

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

## Select The Tested SDK Starter

Detect the current project's language and framework before creating files. Start from the matching template:

- Node.js or TypeScript: `templates/node-express`
- Python: `templates/python-flask`
- Java: `templates/java-spring`
- C# or .NET: `templates/dotnet-minimal`
- Ruby: `templates/ruby-sinatra`
- PHP: `templates/php-slim`

Default to Node.js only when the project has no established language. Preserve the template's exact SDK version, request verifier, environment validation, and contract tests. Adapt the routes and business logic instead of recreating SDK setup. Install the published package; for Java, preserve the template's exact JitPack tag. Never copy generated SDK source into the application.

## Make Webhook URLs Publicly Reachable

Build the app so it constructs absolute URLs from a configurable public base instead of hardcoding `localhost`:

- Require a public HTTPS base URL from an environment variable such as `BASE_URL`.
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

Use the selected template's framework unless the current project already has an equivalent web framework. Keep the official SDK and contract behavior when adapting to an existing framework.

## SMS Workflows

For SMS apps, the Application's `smsUrl` receives inbound messages (FreeClimb POSTs `from`, `to`, `text`). Respond with PerCL using the `Sms` command, sending from a FreeClimb SMS-enabled number.

Honor opt-out and help per `rules/freeclimb.mdc`; see the `sms-compliance` skill for the full pattern.

```text
/sms-inbound: read `text`; if STOP-like -> confirm opt-out; if HELP -> send help; else handle normally.
```

## Validate Before Going Live

Before inviting a live call/SMS, run the selected template's tests and validate each route's serialized SDK PerCL with `freeclimb percl:validate <file|-> --json` (or follow the `verify-flow` skill / `/freeclimb-test-flow` command). Fix every error before continuing.

## Verify Before Telling The User To Call

After `freeclimb dev` is up and the app is running with `BASE_URL` set to the tunnel URL, prove the public path works end to end before inviting the user to call. Surface any failure now, not during the live call:

```bash
curl -s -X POST "<tunnelUrl>/voice" -H 'content-type: application/x-www-form-urlencoded' -d 'callId=test' -w '\n[HTTP %{http_code}]\n'
curl -s -X POST "<tunnelUrl>/menu"  -H 'content-type: application/x-www-form-urlencoded' -d 'digits=1' -w '\n[HTTP %{http_code}]\n'
curl -s -X POST "<tunnelUrl>/menu"  -H 'content-type: application/x-www-form-urlencoded' -d 'digits=2' -w '\n[HTTP %{http_code}]\n'
curl -s -X POST "<tunnelUrl>/menu"  -H 'content-type: application/x-www-form-urlencoded' -d 'digits=9' -w '\n[HTTP %{http_code}]\n'
```

Confirm all return HTTP 200, the `/voice` response contains an absolute `actionUrl` on the tunnel domain (not `localhost`), and `/menu` routes `1`→sales, `2`→support, other→voicemail. Only after these pass should you tell the user the number is ready to call.

## Demo Script

Use this prompt:

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

