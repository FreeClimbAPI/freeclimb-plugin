# FreeClimb Cursor Plugin

Cursor plugin for building and operating FreeClimb voice and SMS workflows with AI agents.

## What It Does

This plugin packages FreeClimb knowledge, guardrails, and MCP access so an agent can turn a business request into a working communications workflow.

For the AI demo, the core flow is:

1. Ask Cursor to create a simple FreeClimb support line.
2. The agent uses the plugin skills to design a small IVR.
3. The agent builds a local webhook app that returns PerCL.
4. The FreeClimb CLI runs the local development environment.
5. You call the FreeClimb number live.

## Setup

Install and authenticate the FreeClimb CLI:

```bash
npm install -g freeclimb-cli
freeclimb login
freeclimb diagnose
```

This plugin's MCP config points directly at the local FreeClimb CLI checkout:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run mcp:start
```

Use the same local CLI form if `freeclimb` is not installed globally:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run diagnose
```

For headless or scripted use, set:

```bash
export FREECLIMB_ACCOUNT_ID=<account_id>
export FREECLIMB_API_KEY=<api_key>
export FREECLIMB_OUTPUT_FORMAT=json
```

## Included Components

- Skills for FreeClimb concepts, PerCL call control, phone workflow building, and debugging.
- A FreeClimb MCP server entry using `mcp:start`.
- A `/build-freeclimb-phone-workflow` command for the demo flow.
- A lightweight rule for safe FreeClimb agent behavior.
- A `freeclimb-builder` agent for business-request-to-phone-workflow tasks.

## Repository Layout

- `.cursor-plugin/plugin.json`: Cursor plugin manifest.
- `.mcp.json`: MCP server wiring for the FreeClimb CLI.
- `skills/`: Agent guidance for FreeClimb concepts, PerCL, workflow building, and debugging.
- `commands/`: Demo command for building a phone workflow.
- `rules/`: FreeClimb-specific agent rules.
- `agents/`: FreeClimb builder subagent definition.
- `demo/ivr-support-line/`: Local IVR webhook app.
- `demo/slides/`: HTML presentation deck and screenshots.
- `demo/RUNBOOK.md`: Live demo setup and rehearsal checklist.

## Demo Prompt

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

## Notes

The MCP server inherits credentials from the FreeClimb CLI environment or login state. Do not put API keys in this plugin.
