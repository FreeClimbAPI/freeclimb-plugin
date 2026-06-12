`freeclimb dashboard`
=====================

AI-driven terminal dashboards for monitoring FreeClimb resources

* [`freeclimb dashboard [PRESET]`](#freeclimb-dashboard-preset)

## `freeclimb dashboard [PRESET]`

Launch an AI-driven terminal dashboard for monitoring FreeClimb resources.

```
USAGE
  $ freeclimb dashboard [PRESET] [--spec <value> | ] [--refresh <value>] [--json] [--no-live] [--list] [-h]

ARGUMENTS
  [PRESET]  (calls|queues|sms|health) Built-in dashboard preset

FLAGS
  -h, --help             Show CLI help.
      --json             Output the dashboard spec as JSON instead of rendering
      --list             List available preset dashboards
      --no-live          Render once and exit (no polling loop)
      --refresh=<value>  [default: 30] Polling interval in seconds (default: 30, min: 10)
      --spec=<value>     Path to a custom JSON dashboard spec file

DESCRIPTION
  Launch an AI-driven terminal dashboard for monitoring FreeClimb resources.

  Built-in presets: calls, queues, sms, health.
  Or provide a custom JSON dashboard spec via --spec.

  Examples:
  $ freeclimb dashboard calls
  $ freeclimb dashboard queues --refresh 15
  $ freeclimb dashboard --spec my-dashboard.json
  $ freeclimb dashboard calls --json
  $ freeclimb dashboard health --no-live


EXAMPLES
  $ freeclimb dashboard calls

  $ freeclimb dashboard queues --refresh 15

  $ freeclimb dashboard --spec custom.json

  $ freeclimb dashboard --list
```

_See code: [src/commands/dashboard.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/dashboard.ts)_
