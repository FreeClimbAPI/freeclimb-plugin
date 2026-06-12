`freeclimb diagnose`
====================

Run diagnostic checks on connectivity and authentication.

Performs the following checks:
  - Credential configuration (env vars, keytar)
  - API connectivity
  - Authentication validity
  - Account status

Useful for troubleshooting authentication or connectivity issues.

* [`freeclimb diagnose`](#freeclimb-diagnose)

## `freeclimb diagnose`

Run diagnostic checks on connectivity and authentication.

```
USAGE
  $ freeclimb diagnose [--json] [-h]

FLAGS
  -h, --help  Show CLI help.
      --json  Output as JSON (for scripting/agents)

DESCRIPTION
  Run diagnostic checks on connectivity and authentication.

  Performs the following checks:
  - Credential configuration (env vars, keytar)
  - API connectivity
  - Authentication validity
  - Account status

  Useful for troubleshooting authentication or connectivity issues.
```

_See code: [src/commands/diagnose.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/diagnose.ts)_
