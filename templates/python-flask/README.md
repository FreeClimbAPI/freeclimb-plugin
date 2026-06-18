# FreeClimb Python/Flask Starter

A minimal FreeClimb voice + SMS webhook app using the official `freeclimb` SDK. It serves a small IVR (greeting → menu → sales/support/voicemail), an SMS auto-responder with STOP/HELP handling, an outbound SMS endpoint, and a health check.

## Routes

| Route | Purpose |
| --- | --- |
| `POST /voice` | Inbound call: greet and collect a digit (set as the Application `voiceUrl`) |
| `POST /menu` | Route digit `1`→sales, `2`→support, other→voicemail |
| `POST /sales`, `POST /support` | Short message, then hang up |
| `POST /voicemail`, `POST /voicemail-saved` | Record a message, then thank the caller |
| `POST /sms-inbound` | Inbound SMS auto-responder with STOP/HELP, replies via the SDK (set as the Application `smsUrl`) |
| `POST /send-sms` | Outbound SMS via the SDK (`{ "to": "+1...", "text": "..." }`) |
| `POST /status` | Fire-and-forget status callback |
| `GET /health` | JSON health check |

## Setup

```bash
cp .env.example .env   # fill in FREECLIMB_* values
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Public URL

FreeClimb must reach your server over HTTPS, and every PerCL `action_url` must be absolute and public (never `localhost`). This app builds URLs from `BASE_URL`, so set it to your tunnel/deploy URL:

```bash
BASE_URL='https://your-tunnel.example' PORT=3000 python app.py
```

Then point a FreeClimb Application's `voiceUrl` at `${BASE_URL}/voice` and `smsUrl` at `${BASE_URL}/sms-inbound`, and assign a number to that Application. Use the `/freeclimb-test-flow` command to validate and simulate before calling live.

## Notes

- Credentials are read from environment variables; never commit `.env`.
- Inbound SMS replies and `/send-sms` use the SDK REST client, so `FREECLIMB_ACCOUNT_ID` / `FREECLIMB_API_KEY` must be set.
- On trial accounts, outbound calls/SMS only reach verified destination numbers.
