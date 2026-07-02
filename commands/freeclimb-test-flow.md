---
name: freeclimb-test-flow
description: Validate a FreeClimb flow's PerCL and simulate the webhook path with realistic FreeClimb request bodies before a live call.
argument-hint: [route or app description]
---

# /freeclimb-test-flow

Validate and simulate a FreeClimb voice or SMS flow before placing a live call or sending a live SMS.

## Workflow

1. Load the `verify-flow` skill (and `percl-call-control` for reference).
2. Identify the routes the app serves and the PerCL each one returns. If an argument is provided, focus on that route or app; otherwise infer from the current project (look for `/voice`, `/menu`, `/sms-inbound`, `/health`, etc.).
3. Phase 1 - PerCL: run the `validate_percl` MCP tool on the array each route returns. Fix every error; treat localhost/relative `actionUrl` warnings as blockers.
4. Phase 2 - simulate: POST realistic FreeClimb form bodies to each route against the public base URL (the `freeclimb dev` tunnel or deploy URL), following each `actionUrl`. Cover the menu branches (1/2/other) and, for SMS, STOP and HELP.
5. Report pass/fail per route in business language, then the exact fix for any failure.
6. Only tell the user the number/line is ready when every route returns HTTP 200, all `actionUrl`s are absolute and public, and `validate_percl` is clean.

## Guardrails

Follow the plugin rule `rules/freeclimb.mdc` — the canonical guardrail list.

- Do not place a real (billable) call or send a real SMS as part of testing unless the user explicitly asks; prefer simulation. If the user asks for a live test call/SMS, run the CLI command with `--dry-run` first and confirm before executing.
- Never use `localhost` or relative URLs in PerCL `actionUrl`s.
