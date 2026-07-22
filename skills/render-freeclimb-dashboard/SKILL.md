---
name: render-freeclimb-dashboard
description: Create privacy-safe FreeClimb dashboards from read-only account data and render them inline in Cursor. Use when the user asks for a dashboard, operations view, visualization, metrics, monitoring, account health, call activity, SMS activity, queues, logs, or a refreshed snapshot.
---

# Render A FreeClimb Dashboard

Guardrails: follow `rules/freeclimb.mdc` (canonical).

## Start With The Decision

Identify what the user needs to decide or monitor. Prefer a small dashboard with:

- Two to four metrics.
- One status or reliability section.
- At most one detail table or chart.
- A snapshot timestamp.

Use a built-in focus when possible: calls, queues, SMS, or health.

## Keep Data Private

Default to aggregate counts and statuses.

Do not request or display:

- Account IDs or resource IDs.
- Phone numbers.
- SMS bodies.
- Log text.
- API keys or credentials.

The renderer masks sensitive state-backed fields, but the spec should avoid requesting them.

## Generate The Spec

Call `generate_dashboard_prompt` with the closest preset. Use its returned spec as the starting point.

Supported data sources:

- `account`
- `applications`
- `calls`
- `conferences`
- `logs`
- `numbers`
- `queues`
- `recordings`
- `sms`

Bind sources under `state` with `$source`. Bind component props with absolute `$state` pointers.

Supported components:

- `Box`
- `Heading`
- `Card`
- `Metric`
- `KeyValue`
- `Table`
- `BarChart`
- `Sparkline`
- `StatusLine`
- `LogStream`
- `CallStatusCard`
- `QueueDepthGauge`

Prefer `Box`, `Heading`, `Card`, `Metric`, `KeyValue`, and `StatusLine` for operational summaries.

## Render

Call `render_dashboard` with the complete spec. Do not generate HTML, JavaScript, CSS, URLs, or actions.

Describe the result as a read-only point-in-time snapshot. Do not call it live or continuously updating.

Lead the final response by telling the user the FreeClimb view opened. Summarize only the decision-relevant findings and do not repeat the dashboard spec or raw tool payload.

If a source fails, keep successful panels visible and summarize the unavailable source without exposing raw API errors.

## Refresh

When the user asks to refresh, call `render_dashboard` again with the same spec.

For a before-and-after event:

1. Render the initial snapshot.
2. Ask the user to perform the inbound event.
3. Wait for the event to finish.
4. Render the same spec again.
5. Compare aggregate values and statuses without exposing identifiers.

## Fallback

If the MCP App cannot render, use the terminal renderer from the plugin root:

```bash
./cli/bin/run dashboard --spec demo/onsite-operations-dashboard.json --no-live
```

Keep raw MCP payloads off shared screens.
