---
name: webrtc-calling
description: Use when enabling browser click-to-call with WebRTC, JWT issuance, JsSIP, or the freeclimb-voice.js client.
---

# WebRTC Calling

Use this skill when end users should call from a web page without switching to the PSTN dialer.

Guardrails: follow `rules/freeclimb.mdc` (canonical). Issue JWTs **server-side only**; never expose Account IDs or API keys to the browser.

## Core Workflow

1. User clicks "Call" in the browser; browser requests a token from **your backend** (not FreeClimb directly from client JS).
2. Backend `POST`s to FreeClimb with Basic Auth and returns the JWT to the browser.
3. Browser loads JsSIP (via `freeclimb-voice.js`) and registers to FreeClimb SIP gateway with `authorization_jwt: Bearer <JWT>`.
4. WebRTC negotiates ICE/STUN/TURN; call lands on the Application **Voice URL** like any inbound call—handle with normal PerCL.

```
Browser → your API → POST /Calls/WebRTC/Token → JWT → freeclimb-voice.js → SIP/WebRTC → Voice URL → PerCL
```

### Issue token (server)

`POST /Accounts/{accountId}/Calls/WebRTC/Token`

```json
{ "to": "+13124567890", "from": "+16307489302", "uses": 10 }
```

| Field | Meaning |
|-------|---------|
| `to` | Destination in inbound SIP message to FreeClimb |
| `from` | Source number in inbound SIP message |
| `uses` | Max times this token can initiate a call |

CLI: `freeclimb calls:webrtc-token --to <E.164> --from <E.164> --uses <n>` with the same fields. The JWT is printed once—treat it as a secret and pass it straight to the browser session.

### Browser client (freeclimb-voice.js + JsSIP)

```javascript
var config = {
  user: '<FROM USER>',
  domain: '<DOMAIN>',
  proxy: '<SIP Gateway>',
  port: 443,
  authorization_jwt: 'Bearer <JWT>'
};
var engine = new FreeClimbVoice();
engine.start(config);
engine.dial('+1234567890');
```

Hook callbacks: `call_connected`, `call_failed`, `call_disconnected`, `call_ended`, `incoming_call`.

## Token Handling

- Treat JWTs as **short-lived, limited-use secrets**—scoped by `uses` count.
- Never log tokens, embed them in URLs, or commit them to source control.
- Re-fetch per click-to-call session; do not cache long-term in localStorage.
- FreeClimb docs: JWTs minimize blast radius if a browser session is compromised.

## Trial-Account Caveats

- Outbound/WebRTC-originated calls follow the same trial limits as REST outbound: **verified destination numbers only**.
- Confirm the target Application's Voice URL is HTTPS and reachable before testing in-browser.
- Microphone permission is required; handle denial gracefully in UI.

## Webhooks Involved

Once connected, standard voice webhooks apply (`inbound`/`callConnectUrl`, `GetDigits`, etc.)—same as PSTN inbound to the Application.

## Pitfalls

- JWT issuance must use server-side credentials from the OS keyring—never paste keys into chat or front-end code.
- Development servers (`flask run`, etc.) are not production-ready; tunnel HTTPS for webhook testing per `webhook-security` skill.
- Test with JsSIP/`freeclimb-voice.js` as documented; other SIP stacks may need extra SDP/WebRTC tuning.

## References

- https://docs.freeclimb.com/docs/webrtc-and-freeclimb
- https://docs.freeclimb.com/docs/make-a-webrtc-enabled-call
- https://docs.freeclimb.com/reference/create-jwt
- https://docs.freeclimb.com/reference/freeclimb-jwt-issuance
