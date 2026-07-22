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

1. Load the `freeclimb-concepts`, `percl-call-control`, `build-a-phone-workflow`, `freeclimb-sdks`, `webhook-security`, and `verify-flow` skills.
2. Restate the requested phone workflow in business language.
3. Detect the current project's language and framework. Select the matching tested starter from `templates/node-express`, `templates/python-flask`, `templates/java-spring`, `templates/dotnet-minimal`, `templates/ruby-sinatra`, or `templates/php-slim`. Default to Node.js only when no language is established.
4. Copy the starter into the user's project without copying SDK source, preserve its exact SDK pin and security boundary, then adapt the routes to the requested workflow.
5. Use the SDK's PerCL builders in every voice/SMS route and validate serialized arrays with `freeclimb percl:validate <file|-> --json`.
6. Run the starter's non-billable contract tests and tell the user how to run the app locally.
7. Use `freeclimb dev --port 3000` when the user is ready to connect the app to FreeClimb.
8. Before inviting a live call, run `/freeclimb-test-flow` to validate PerCL and simulate the webhook path.
9. After the user calls the number, use the FreeClimb MCP read tools to list calls and logs.

## Guardrails

Follow the plugin rule `rules/freeclimb.mdc` (canonical).

- Treat real phone numbers as sensitive; avoid printing them unless the user provides them for the task at hand.
