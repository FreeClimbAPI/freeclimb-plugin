# IVR Support Line

A small FreeClimb voice webhook app for a live demo. Callers hear a greeting and a menu:

- Press `1` for sales
- Press `2` for support
- Press `3` for billing
- Anything else (or no input) goes to voicemail

## Call Flow

| Route              | PerCL behavior                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| `POST /voice`      | Greet the caller and collect one digit (`GetDigits`).                     |
| `POST /menu`       | Route `1` → sales, `2` → support, `3` → billing, everything else → voicemail. |
| `POST /sales`      | Short sales message, then `Hangup`.                                       |
| `POST /support`    | Short support message, then `Hangup`.                                     |
| `POST /billing`    | Short billing message, then `Hangup`.                                     |
| `POST /voicemail`  | Prompt the caller, then `RecordUtterance`.                                |
| `POST /voicemail-saved` | Thank the caller, then `Hangup`.                                     |
| `GET /health`      | Returns JSON for quick local checks.                                      |

## FreeClimb Resources Needed

To take a real call, FreeClimb needs:

1. **Account** — your FreeClimb Account ID + API Key (the CLI uses these).
2. **Application** — a webhook config whose `voiceUrl` points at this app's public `POST /voice` URL.
3. **Phone number** — a FreeClimb number assigned to that Application.
4. **Public URL** — a tunnel so FreeClimb can reach this locally running app.

When a caller dials the number, FreeClimb POSTs to `voiceUrl`, this app returns PerCL, and FreeClimb executes the commands in order.

## Run It Locally

Install dependencies and start the server:

```bash
npm install
npm start
```

The app listens on port `3000` by default (`PORT` to override). Verify it:

```bash
curl http://localhost:3000/health
```

### Go Live With The FreeClimb CLI

The simplest path is `freeclimb dev`, which creates a tunnel, configures the
Application's webhook URLs, and can assign a number:

```bash
freeclimb dev --port 3000
```

Then call the assigned FreeClimb number to walk the menu live.

If you run your own tunnel instead, set `PUBLIC_BASE_URL` so the PerCL
`actionUrl` values use the public host:

```bash
export PUBLIC_BASE_URL=https://your-tunnel-host
npm start
```

## Notes

- Keep webhook responses fast; do any long-running work after responding.
- Do not put Account IDs or API keys in this app. The CLI supplies credentials.
- Trial accounts can only place outbound calls/SMS to verified numbers, but
  inbound calls to your FreeClimb number work without verification.
