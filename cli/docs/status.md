`freeclimb status`
==================

Display account overview and health status.

Shows a summary of your FreeClimb account including:
  - Account type and status
  - Current balance (if available)
  - Number of phone numbers owned
  - Number of applications
  - Recent activity summary

Use --json for machine-readable output.

* [`freeclimb status`](#freeclimb-status)

## `freeclimb status`

Display account overview and health status.

```
USAGE
  $ freeclimb status [--json] [-h]

FLAGS
  -h, --help  Show CLI help.
      --json  Output as JSON (for scripting/agents)

DESCRIPTION
  Display account overview and health status.

  Shows a summary of your FreeClimb account including:
  - Account type and status
  - Current balance (if available)
  - Number of phone numbers owned
  - Number of applications
  - Recent activity summary

  Use --json for machine-readable output.
```

_See code: [src/commands/status.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/status.ts)_
