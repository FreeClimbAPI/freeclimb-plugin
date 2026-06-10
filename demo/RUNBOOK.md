# FreeClimb AI Demo Runbook

## Local Artifacts

- Cursor plugin repo: `/Users/jbohne/Projects/Freeclimb/freeclimb-plugin`
- Demo app: `demo/ivr-support-line`
- CLI path: `/Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run`
- Slide deck: `demo/slides/freeclimb-ai-demo.html`

## Account Staging

Complete these before the live presentation:

1. Authenticate the CLI:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run login
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run diagnose
```

2. Confirm at least one owned voice-capable FreeClimb number:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run incoming-numbers:list --fields phoneNumberId,phoneNumber,applicationId --json
```

3. If no suitable number exists, find one and buy it from the dashboard or CLI.

4. Pre-verify the presenter's cell number in the FreeClimb dashboard for trial-account outbound calls and SMS.

5. Confirm MCP starts:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run mcp:start
```

## Live Demo Rehearsal

1. Start the local app:

```bash
cd /Users/jbohne/Projects/Freeclimb/freeclimb-plugin/demo/ivr-support-line
npm start
```

2. In another terminal, connect it to FreeClimb:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run dev --port 3000
```

3. Call the FreeClimb number shown by the CLI.

4. Press `1`, `2`, and another key across separate calls to verify each branch.

5. Check calls and logs:

```bash
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run calls:list --fields callId,status,from,to,dateCreated --json
node /Users/jbohne/Projects/Freeclimb/freeclimb-cli/bin/run logs:filter --pql 'level = "ERROR"' --json
```

## Presentation Prompt

```text
Create a simple FreeClimb support line for a small business.

When someone calls, greet them, ask them to press 1 for sales or 2 for support, and send anyone else to voicemail. Build the local webhook app, explain what FreeClimb resources are needed, and help me run it so I can call the number live.
```

## Talk Track

- FreeClimb is flexible enough to support many communications workflows.
- That same flexibility can be heavy for a person setting things up manually.
- AI agents can absorb the setup complexity if we give them product knowledge, tools, and guardrails.
- The Cursor plugin gives the agent FreeClimb context.
- MCP gives the agent a safe way to inspect and use FreeClimb.
- The CLI handles local development and operations.
- The result is a much shorter path from idea to working communications workflow.
