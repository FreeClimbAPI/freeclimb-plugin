`freeclimb listen`
==================

Start a local webhook listener for FreeClimb events.

Starts a public tunnel and local proxy server that forwards incoming
FreeClimb webhooks (voice, SMS, status callbacks) to your local
application. Events are displayed in real-time in the terminal.

Use the printed tunnel URL as your FreeClimb application's voiceUrl,
smsUrl, or statusCallbackUrl.

For a fully automated local dev setup, see: freeclimb dev

* [`freeclimb listen`](#freeclimb-listen)

## `freeclimb listen`

Start a local webhook listener for FreeClimb events.

```
USAGE
  $ freeclimb listen [-p <value>] [--tunnel-port <value>] [-t ngrok|cloudflared] [--json] [-h]

FLAGS
  -h, --help                 Show CLI help.
  -p, --port=<value>         [default: 3000] Port of your local application
  -t, --tunnel=<option>      [default: ngrok] Tunnel provider (ngrok or cloudflared)
                             <options: ngrok|cloudflared>
      --json                 Output events as NDJSON (for scripting/agents)
      --tunnel-port=<value>  [default: 4000] Port for the local proxy server

DESCRIPTION
  Start a local webhook listener for FreeClimb events.

  Starts a public tunnel and local proxy server that forwards incoming
  FreeClimb webhooks (voice, SMS, status callbacks) to your local
  application. Events are displayed in real-time in the terminal.

  Use the printed tunnel URL as your FreeClimb application's voiceUrl,
  smsUrl, or statusCallbackUrl.

  For a fully automated local dev setup, see: freeclimb dev


EXAMPLES
  $ freeclimb listen

  $ freeclimb listen --port 8080

  $ freeclimb listen --tunnel ngrok

  $ freeclimb listen --tunnel cloudflared

  $ freeclimb listen --json
```

_See code: [src/commands/listen.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/listen.ts)_
