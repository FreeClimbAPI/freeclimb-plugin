`freeclimb dev`
===============

Start a full local development environment for FreeClimb.

Creates a public tunnel, a temporary FreeClimb application with webhook
URLs pointing at the tunnel, and optionally assigns a phone number.
All resources are cleaned up automatically when you stop the command.

This is the fastest way to go from zero to handling live calls/SMS locally.

* [`freeclimb dev`](#freeclimb-dev)

## `freeclimb dev`

Start a full local development environment for FreeClimb.

```
USAGE
  $ freeclimb dev [-p <value>] [-t ngrok|cloudflared] [-n <value>] [--app-id <value>] [--json] [-h]

FLAGS
  -h, --help             Show CLI help.
  -n, --number=<value>   Phone number ID (PN_xxx) to assign to the dev application
  -p, --port=<value>     [default: 3000] Port of your local application
  -t, --tunnel=<option>  [default: ngrok] Tunnel provider (ngrok or cloudflared)
                         <options: ngrok|cloudflared>
      --app-id=<value>   Use an existing application instead of creating a temporary one
      --json             Output events as NDJSON (for scripting/agents)

DESCRIPTION
  Start a full local development environment for FreeClimb.

  Creates a public tunnel, a temporary FreeClimb application with webhook
  URLs pointing at the tunnel, and optionally assigns a phone number.
  All resources are cleaned up automatically when you stop the command.

  This is the fastest way to go from zero to handling live calls/SMS locally.


EXAMPLES
  $ freeclimb dev

  $ freeclimb dev --port 8080

  $ freeclimb dev --number PN_abc123

  $ freeclimb dev --app-id AP_abc123

  $ freeclimb dev --tunnel cloudflared
```

_See code: [src/commands/dev.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/dev.ts)_
