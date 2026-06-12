# Voice Application Patterns

This document covers common architectures for building production voice applications with FreeClimb. All patterns use PerCL webhooks.

## Webhook Server Architecture

A FreeClimb voice application is a web server that:
1. Receives HTTP POST requests from FreeClimb
2. Returns PerCL JSON arrays that control the call

### Minimal Express Server (Node.js)

```javascript
import express from "express"

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Inbound call handler (set as Application's voiceUrl)
app.post("/voice", (req, res) => {
  const { from, to, callId } = req.body
  res.json([
    { Say: { text: `Hello. You called from ${from}.` } },
    {
      GetDigits: {
        actionUrl: `${process.env.BASE_URL}/menu`,
        prompts: [{ Say: { text: "Press 1 for sales. Press 2 for support." } }],
        maxDigits: 1,
        initialTimeoutMs: 8000,
      },
    },
  ])
})

// Menu handler
app.post("/menu", (req, res) => {
  const { digits } = req.body
  switch (digits) {
    case "1":
      res.json([{ Redirect: { actionUrl: `${process.env.BASE_URL}/sales` } }])
      break
    case "2":
      res.json([{ Redirect: { actionUrl: `${process.env.BASE_URL}/support` } }])
      break
    default:
      res.json([
        { Say: { text: "Invalid selection." } },
        { Redirect: { actionUrl: `${process.env.BASE_URL}/voice` } },
      ])
  }
})

app.listen(3000)
```

### Key Principles

- **Stateless endpoints**: Each webhook is a standalone request. Use a database or session store if you need state across requests.
- **Fast responses**: FreeClimb expects a response within seconds. Long-running logic should happen asynchronously.
- **HTTPS required**: Webhook URLs must be HTTPS in production.
- **Public URL needed**: FreeClimb must reach your server. Use ngrok or a tunnel for local development.

## IVR (Interactive Voice Response) Tree

An IVR presents a menu tree where callers navigate using DTMF keypresses.

### Architecture

```
Inbound call
    │
    ▼
Main Menu (GetDigits)
    ├── Press 1 → Sales (GetDigits or OutDial)
    │                 ├── Press 1 → Product info (Say)
    │                 └── Press 2 → Talk to sales (OutDial)
    ├── Press 2 → Support (GetDigits)
    │                 ├── Press 1 → Check status (Say + API lookup)
    │                 └── Press 2 → Talk to agent (Enqueue)
    ├── Press 3 → Hours & Location (Say)
    └── Press 0 → Operator (OutDial)
```

### Implementation Pattern

Each menu level is a separate endpoint:

```
POST /voice          → Main menu (GetDigits → actionUrl: /menu)
POST /menu           → Route based on digits (Redirect → /sales or /support)
POST /sales          → Sales submenu (GetDigits → actionUrl: /sales-menu)
POST /sales-menu     → Route sales selection
POST /support        → Support submenu
```

### Handling Invalid Input

Always handle unexpected digits and timeouts:

```javascript
app.post("/menu", (req, res) => {
  const { digits } = req.body
  if (!digits || !["1", "2", "3", "0"].includes(digits)) {
    // Replay the menu on invalid input
    res.json([
      { Say: { text: "Sorry, I didn't understand." } },
      { Redirect: { actionUrl: `${process.env.BASE_URL}/voice` } },
    ])
    return
  }
  // ... handle valid digits
})
```

## Call Center / Queue Pattern

Route callers to available agents using queues.

### Architecture

```
Caller calls in
    │
    ▼
Greeting + Enqueue
    │
    ▼
Hold music plays (waitUrl)
    │
Agent becomes available
    │
    ▼
Dequeue → Connect to agent (conference or direct)
```

### Caller Side

```javascript
// Caller hits this when calling in
app.post("/inbound", (req, res) => {
  res.json([
    { Say: { text: "Thank you for calling support. An agent will be with you shortly." } },
    {
      Enqueue: {
        queueId: process.env.QUEUE_ID,
        waitUrl: `${process.env.BASE_URL}/hold`,
        actionUrl: `${process.env.BASE_URL}/dequeued`,
      },
    },
  ])
})

// Hold experience (called periodically while in queue)
app.post("/hold", (req, res) => {
  res.json([
    { Say: { text: "Your call is important to us. Please continue to hold." } },
    { Play: { file: `${process.env.BASE_URL}/hold-music.wav` } },
  ])
})
```

### Agent Side

```javascript
// Agent dashboard triggers this to connect the next caller
app.post("/agent-ready", async (req, res) => {
  // Make outbound call to agent, then dequeue the first caller
  const response = await fetch("https://www.freeclimb.com/apiserver/Accounts/{id}/Calls", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${ACCOUNT_ID}:${API_KEY}`)}` },
    body: JSON.stringify({
      to: req.body.agentNumber,
      from: process.env.FREECLIMB_NUMBER,
      applicationId: process.env.AGENT_APP_ID,
    }),
  })
  res.json({ status: "connecting" })
})

// When agent's call connects, dequeue the caller
app.post("/agent-connected", (req, res) => {
  res.json([{ Dequeue: {} }])
})
```

## Voicemail Pattern

Record a message when no one answers or after hours.

```javascript
app.post("/voicemail", (req, res) => {
  res.json([
    { Say: { text: "No one is available. Please leave a message after the beep. Press pound when finished." } },
    {
      RecordUtterance: {
        actionUrl: `${process.env.BASE_URL}/voicemail-saved`,
        silenceTimeoutMs: 5000,
        maxLengthSec: 120,
        finishOnKey: "#",
        playBeep: true,
      },
    },
  ])
})

app.post("/voicemail-saved", (req, res) => {
  const { recordingUrl, recordingId, from } = req.body
  // Store recording details in your database
  // Send notification to staff (email, Slack, etc.)
  res.json([
    { Say: { text: "Your message has been recorded. Goodbye." } },
    { Hangup: {} },
  ])
})
```

## Call Transfer Pattern

Transfer a call to another number using OutDial.

```javascript
app.post("/transfer", (req, res) => {
  const destination = req.body.transferTo || "+15551234567"
  res.json([
    { Say: { text: "Transferring your call. Please hold." } },
    {
      OutDial: {
        destination,
        callingNumber: process.env.FREECLIMB_NUMBER,
        actionUrl: `${process.env.BASE_URL}/transfer-result`,
        callConnectUrl: `${process.env.BASE_URL}/transfer-connected`,
        timeout: 30,
      },
    },
  ])
})

// Called when the transfer destination answers
app.post("/transfer-connected", (req, res) => {
  // Return empty PerCL to connect the calls
  res.json([])
})

// Called when the OutDial completes (answered, busy, no answer)
app.post("/transfer-result", (req, res) => {
  const { dialCallStatus } = req.body
  if (dialCallStatus !== "completed") {
    // Transfer failed — send to voicemail
    res.json([{ Redirect: { actionUrl: `${process.env.BASE_URL}/voicemail` } }])
    return
  }
  res.json([{ Hangup: {} }])
})
```

## SMS Auto-Responder Pattern

Respond automatically to incoming SMS.

```javascript
// Set as Application's smsUrl
app.post("/sms-inbound", (req, res) => {
  const { from, text } = req.body
  const lowerText = text.toLowerCase()

  let reply = "Thanks for your message! Reply HELP for options."
  if (lowerText === "help") {
    reply = "Reply HOURS for business hours. Reply STATUS for order status."
  } else if (lowerText === "hours") {
    reply = "We're open Mon-Fri 9am-5pm EST."
  } else if (lowerText === "status") {
    reply = "Reply with your order number for status updates."
  }

  res.json([
    {
      Sms: {
        to: from,
        from: process.env.FREECLIMB_NUMBER,
        text: reply,
      },
    },
  ])
})
```

## Status Callbacks

The `statusCallbackUrl` receives fire-and-forget POST requests when call status changes. Use these for logging, analytics, and triggering downstream actions.

```javascript
app.post("/status-callback", (req, res) => {
  const { callId, callStatus, callDuration, from, to } = req.body
  // Log to your analytics system
  // Update CRM records
  // Trigger post-call workflows
  res.sendStatus(200) // No PerCL needed — just acknowledge
})
```

### Status Callback Events

| Status | When |
|--------|------|
| `ringing` | Destination phone rings |
| `inProgress` | Call connected |
| `completed` | Call ended normally |
| `canceled` | Call canceled before connection |
| `failed` | Call failed |
| `busy` | Destination busy |
| `noAnswer` | No answer within timeout |

## Local Development Setup

For local development, expose your server with a tunnel:

```bash
# Start your server
node server.js  # Runs on localhost:3000

# Expose via ngrok (or similar)
ngrok http 3000  # Gives you https://abc123.ngrok.io

# Create Application pointing to tunnel URL
freeclimb applications:create \
  --alias "Dev App" \
  --voiceUrl "https://abc123.ngrok.io/voice" \
  --smsUrl "https://abc123.ngrok.io/sms-inbound" \
  --statusCallbackUrl "https://abc123.ngrok.io/status-callback"

# Assign a number to the application
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --applicationId "AP..."
```
