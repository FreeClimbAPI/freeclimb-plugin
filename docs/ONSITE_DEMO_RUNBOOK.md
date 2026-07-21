# FreeClimb Plugin Onsite Demo Runbook

## Goal

Show that a person can move from business intent to an observable FreeClimb workflow without first learning the API surface. The dashboard is the visual centerpiece. One inbound call proves that the view is connected to live data.

## 20–25 minute run of show

### 0:00–2:00 — Set the frame

- FreeClimb is flexible, but the first successful workflow requires connecting concepts, webhooks, PerCL, Applications, numbers, logs, and account limits.
- The plugin packages that context, tooling, and safety model for the agent.
- The goal is not to replace the Dashboard or SDKs. It is to shorten the path from an idea to a working, observable communications workflow.

### 2:00–6:00 — Explain the product

- Skills teach the agent FreeClimb concepts and implementation patterns.
- Rules keep credential handling, trial limits, SMS compliance, and public webhook requirements in context.
- MCP provides read-only inspection, PerCL generation and validation, and in-IDE UI.
- CLI commands perform account-changing actions behind dry-runs and explicit approval.
- Hooks nudge first-run setup, validate PerCL files, and require approval for risky CLI commands.

### 6:00–9:00 — Explain the safety boundary

- Credentials are entered only in the local browser login flow and stored in the OS keyring.
- MCP has no mutating tools.
- Account changes and billable operations use the CLI.
- A dry-run previews mutating requests before execution.
- Cursor approvals remain the primary control for shell execution.

### 9:00–16:00 — Live dashboard demo

Paste:

```text
Create a live FreeClimb operations dashboard focused on account health, call counts, and errors. Use read-only MCP tools and render it in the IDE. Keep account IDs, phone numbers, message bodies, and log text hidden. After I place one inbound call, refresh the dashboard and summarize the new event with identifiers and phone numbers redacted.
```

Expected sequence:

1. The agent reads account status, recent calls, and recent error logs.
2. The agent renders a FreeClimb-themed operations view in the IDE.
3. Call the prepared FreeClimb number from a phone.
4. Refresh recent calls after the call ends.
5. Summarize the new call status and related log outcome without displaying identifiers, phone numbers, message bodies, or log text.
6. Point out that no account mutation was needed for inspection or rendering.

Audience-visible success signals:

- Account state appears without exposing credentials.
- Recent calls render as cards, tables, or a composed dashboard instead of raw JSON.
- The inbound call appears after refresh.
- The agent can explain the call status and related logs in context.

### 16:00–20:00 — Connect the demo to business value

- Faster prototypes and internal demos.
- Lower onboarding friction for new FreeClimb builders.
- A consistent safety model across workflows.
- The same structured knowledge improves both agent behavior and human documentation.
- Operations and debugging become conversational without making the read surface capable of spending money.

### 20:00–25:00 — Roadmap and questions

- Internal Cursor distribution first.
- Public Cursor marketplace after the local build and setup path is hardened.
- Hosted MCP and signed packages can remove first-run build friction.
- Broader AI-client support follows the same MCP, CLI, skill, and rule separation.

## Preflight checklist

Complete at least 30 minutes before presenting:

- Laptop power connected and sleep disabled for the session.
- Cursor plugin synced to the tested revision.
- Node.js 20 or newer and pnpm available.
- `pnpm validate`, `pnpm build`, `pnpm test`, and `pnpm lint` pass.
- Browser login succeeds without credentials entering chat or shell history.
- MCP reports the FreeClimb tools as available.
- `get_account`, `list_calls`, and `filter_logs` succeed without their raw payloads being projected.
- The in-IDE calls view and composed dashboard both render.
- `freeclimb dashboard --spec demo/onsite-operations-dashboard.json --no-live` works as the terminal fallback.
- The selected number is assigned to the intended Application.
- The webhook is publicly reachable over HTTPS if the inbound flow depends on a local app.
- The phone used for the inbound call has service and is not muted.
- The deck opens offline and the demo slide copy button works.
- Screen sharing hides notifications and unrelated terminals.

## Demo resource policy

- Prefer an existing number and Application.
- Do not buy a number during the presentation.
- Do not place an outbound call or send an SMS unless that action has already been dry-run and explicitly approved.
- If routing must change, dry-run the Application or number update, capture the original non-sensitive configuration, apply only after approval, and restore it after the demo.
- Use E.164 formatting whenever a phone number must be entered.
- On a trial account, outbound calls and SMS require verified destinations.

## Fallback sequence

If the composed in-IDE dashboard does not render:

1. Run `freeclimb dashboard --spec demo/onsite-operations-dashboard.json --no-live` from the plugin root.
2. Keep raw `list_calls`, `get_account`, and `filter_logs` payloads off the projector.
3. Explain the same MCP-versus-CLI boundary while using the terminal dashboard.

If the live inbound event does not appear:

1. Refresh recent calls after the call has fully ended.
2. Inspect recent logs for webhook, routing, or authentication errors.
3. Show the most recent completed call and explain the intended refresh.
4. Continue to Q&A rather than debugging the local tunnel on screen.

If authentication fails:

1. State that credentials are intentionally unavailable to the agent.
2. Use the local browser login flow.
3. If login still fails, use the prepared terminal dashboard output and continue the narrative.

## Likely questions

### What is the plugin?

It is a Cursor plugin that packages FreeClimb skills, rules, commands, agents, hooks, a read-only MCP server, and a CLI. It gives agents both domain context and constrained execution paths.

### Who is it for?

It is initially for internal teams and builders who want to prototype, inspect, or debug FreeClimb workflows faster. It is especially useful when the user understands the business outcome but not every FreeClimb resource or PerCL detail.

### What is the business value?

The plugin reduces time-to-first-working-workflow, makes demos and prototypes easier, and lowers the amount of platform-specific setup a new builder must hold in working memory. It can also reduce support friction by giving the agent structured diagnostic guidance.

### Does this replace the FreeClimb Dashboard or SDKs?

No. The plugin uses existing FreeClimb APIs and official SDK patterns. It adds an agent-oriented layer for context, orchestration, validation, local development, and inspection.

### Why are there both MCP tools and a CLI?

The separation is intentional. MCP is convenient for agent-initiated inspection and UI, so its tool surface is read-only. The CLI is visible in the terminal and governed by Cursor execution approvals, making it the safer place for account-changing or billable actions.

### Can MCP place a call, send an SMS, or buy a number?

No. Those actions are deliberately absent from the MCP tool surface. They must use the CLI.

### Is MCP read-only at the API credential level?

No. FreeClimb currently provides a full-access API credential. Read-only behavior is enforced by the MCP tool surface and regression tests. Scoped FreeClimb credentials would strengthen this boundary in the future.

### Where are credentials stored?

The Account ID and API key are entered into a loopback browser page and stored in the OS keyring under the FreeClimb service. They are not placed in MCP configuration, chat, or project files.

### Can the agent see the API key?

The intended workflow does not expose it to the agent. The MCP server and CLI retrieve it from the OS keyring internally.

### What prevents prompt injection from spending money?

MCP exposes no mutating tools. A prompt would have to produce a CLI command, which is subject to shell approvals. The plugin also requires dry-runs and has a hook that forces explicit approval for risky commands issued without a dry-run.

### Are all risky actions impossible without approval?

No software prompt is a complete security boundary. The design reduces risk through tool separation, dry-runs, input validation, and Cursor approvals. Users should keep Run Mode on Allowlist and MCP and browser protections enabled.

### What does the dashboard show?

The built-in views cover calls, queues, SMS activity, and account health. The agent can also generate a composed dashboard from supported read-only data sources and render it in the IDE.

### Is the dashboard generated by AI?

The agent chooses or generates a validated dashboard specification. Rendering uses a constrained component catalog and approved data-source bindings rather than arbitrary executable UI code.

### Why use an inbound call in the demo?

The inbound call is a low-complexity event that visibly changes live account data. It proves the dashboard is connected without making an outbound call the centerpiece.

### What does first-run setup require?

Node.js 20 or newer, pnpm, a native build toolchain, one workspace build, local browser authentication, and a Cursor reload. Removing this build step is a documented future improvement.

### Does it work outside Cursor?

The MCP server follows an open protocol and the CLI is independent, but the packaged plugin, hooks, commands, and current distribution path target Cursor. Other AI clients are roadmap work rather than a fully supported claim today.

### How is it distributed today?

A Cursor team administrator can add the repository as a team plugin. The current version syncs source and performs a one-time local build. Public marketplace distribution is a later step.

### What is tested?

CI validates the plugin manifest and component metadata, scans for secrets, builds all workspaces, and runs core, MCP, and CLI tests on macOS and Linux. Tests pin the MCP tool surface and cover PerCL, HTTP behavior, CLI dry-runs, dashboard data, and much of the development lifecycle.

### What is not automated yet?

The real plugin-sync-to-browser-login cold start, Cursor hook behavior, live tunnel behavior, and a true inbound telephony event require manual integration testing. The onsite preparation includes that manual path.

### What happens on a trial account?

Outbound calls and SMS are limited to verified destinations. Inbound calls are the preferred demo path. Number limits and other trial restrictions still apply.

### How does SMS compliance work?

The plugin provides contextual guidance for consent, STOP and UNSUBSCRIBE, HELP, quiet hours, and 10DLC. It does not replace legal review or carrier registration requirements.

### How are public webhook URLs handled?

PerCL action URLs and Application webhook URLs must be absolute, publicly reachable HTTPS URLs. Localhost and relative URLs cannot be reached by FreeClimb. The local development command can create a tunnel and temporarily wire an Application.

### Who owns support and maintenance?

The repository does not yet define a formal production owner, support SLA, or rollout playbook. That should be resolved before broad external distribution.

### How is this different from a generic coding agent?

A generic agent can write an Express route. The plugin adds FreeClimb-specific resource knowledge, PerCL patterns, live read-only inspection, validation, credential handling, trial constraints, compliance guidance, guarded actions, and operational diagnostics.

### How does this compare with competitor plugins?

The strategic need is similar: make the communications platform available where builders already use agents. The FreeClimb design emphasizes a read-only MCP surface, CLI-mediated actions, PerCL-native validation, and packaged operational guidance.

## Known limitations to state plainly

- MCP read-only enforcement is at the tool layer, not through a scoped API credential.
- The first run performs a local build and requires native dependencies.
- The current security architecture review is an internal draft.
- The local development tunnel exposes a public endpoint and does not yet provide a documented webhook-signature verification guarantee.
- The repository does not define account-level spend controls.
- Phone numbers, message bodies, and logs can contain sensitive data that may enter model context.
- Public marketplace readiness, formal ownership, Windows parity, and a hosted MCP service are not complete.

## Final presenter cues

- Say “read-only inspection” whenever discussing MCP.
- Say “guarded action” whenever discussing CLI mutations.
- Do not claim that the plugin makes autonomous spending safe.
- Do not claim that the current package supports every AI client.
- Keep the dashboard visible while explaining the business outcome.
- Treat the call as proof that data is live, not as the main product.
