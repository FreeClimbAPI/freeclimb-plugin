# FreeClimb CLI - Agent Guide

## Git Remotes - READ THIS FIRST

- `origin` = `FreeClimbAPI/freeclimb-cli` (upstream, READ-ONLY)
- `work` = `jbohnevail/freeclimb-cli` (fork, push here)
- **NEVER create PRs against FreeClimbAPI/freeclimb-cli**
- Always: `git push work <branch>` and PRs target `jbohnevail/freeclimb-cli`

This CLI is frequently invoked by AI/LLM agents. Always assume inputs can be adversarial.

---

# FreeClimb Platform Concepts

FreeClimb is a cloud communications API for building voice and SMS applications. This document covers the core concepts any agent needs to work effectively with FreeClimb.

## Account Model

Every FreeClimb user has an **Account** with two credentials:

| Field | Format | Example |
|-------|--------|---------|
| Account ID | `AC` + 40 hex chars | `AC1234567890abcdef1234567890abcdef12345678` |
| API Key | 40 hex chars | `abcdef1234567890abcdef1234567890abcdef12` |

**Authentication**: HTTP Basic Auth where username = Account ID, password = API Key.

**Base URL**: `https://www.freeclimb.com/apiserver/Accounts/{accountId}`

All API paths are relative to this base. For example, `/Calls` resolves to:
`https://www.freeclimb.com/apiserver/Accounts/{accountId}/Calls`

### Trial vs Paid Accounts

| Restriction | Trial | Paid |
|-------------|-------|------|
| Phone numbers | Limited count | Unlimited |
| Outbound calls | Verified numbers only | Any number |
| International calls | Blocked | Available |
| Concurrent calls | Limited | Based on plan |

Trial accounts can only call/SMS numbers that have been verified in the FreeClimb dashboard.

## Resource Types

FreeClimb resources follow a consistent pattern: each has a unique ID with a two-letter prefix.

| Resource | ID Prefix | Example | Description |
|----------|-----------|---------|-------------|
| Account | `AC` | `AC1234...` | Your FreeClimb account |
| Application | `AP` | `AP5678...` | Webhook configuration for handling calls/SMS |
| Call | `CA` | `CA9012...` | A voice call (inbound or outbound) |
| Message (SMS) | `SM` | `SM3456...` | An SMS message |
| Phone Number | `PN` | `PN7890...` | An owned incoming phone number |
| Conference | `CF` | `CF1234...` | A multi-party call |
| Queue | `QU` | `QU5678...` | A call queue (hold callers for agents) |
| Recording | `RE` | `RE9012...` | An audio recording from a call or conference |

## Phone Numbers

All phone numbers must be in **E.164 format**: `+{country code}{number}`

Examples:
- US: `+15551234567`
- UK: `+447911123456`

### Phone Number Lifecycle

```
Search available    →    Buy number    →    Assign to Application    →    Receive calls/SMS
(browse inventory)       (purchase)         (link webhook URLs)           (FreeClimb hits webhooks)
```

1. **Search**: Query available numbers by area code, country, SMS/voice capability
2. **Buy**: Purchase immediately (non-reversible for trial accounts)
3. **Assign**: Link to an Application so inbound calls/SMS trigger your webhooks
4. **Use**: Inbound events hit your Application's webhook URLs; outbound calls/SMS use the number as caller ID

## Applications

An **Application** is a configuration object that tells FreeClimb where to send webhook requests. It defines the URLs that FreeClimb calls when events occur.

### Webhook URLs

| URL | Triggered When | Expected Response |
|-----|---------------|-------------------|
| `voiceUrl` | Inbound call received | PerCL JSON commands |
| `voiceFallbackUrl` | `voiceUrl` fails/times out | PerCL JSON commands |
| `smsUrl` | Inbound SMS received | PerCL JSON commands (optional) |
| `smsFallbackUrl` | `smsUrl` fails/times out | PerCL JSON commands (optional) |
| `callConnectUrl` | Outbound call connects | PerCL JSON commands |
| `statusCallbackUrl` | Call status changes | None (fire-and-forget) |

### How Webhooks Work

1. An event occurs (e.g., someone calls your FreeClimb number)
2. FreeClimb sends an HTTP POST to your Application's `voiceUrl`
3. Your server responds with PerCL JSON commands (e.g., play a greeting, collect digits)
4. FreeClimb executes those commands
5. If a command specifies an `actionUrl`, FreeClimb calls that URL next with the results
6. This cycle repeats until the call ends

```
Caller dials your number
        │
        ▼
FreeClimb ──POST──► voiceUrl (your server)
        │                    │
        │              PerCL response:
        │              [Say, GetDigits]
        ▼                    │
FreeClimb executes ◄─────────┘
Say + GetDigits
        │
  Caller presses "1"
        │
        ▼
FreeClimb ──POST──► actionUrl (with digits="1")
        │                    │
        │              PerCL response:
        │              [OutDial to agent]
        ▼                    │
FreeClimb executes ◄─────────┘
```

## Call States

| Status | Description |
|--------|-------------|
| `queued` | Call created, not yet initiated |
| `ringing` | Destination phone is ringing |
| `inProgress` | Call is active |
| `canceled` | Call was canceled before connecting |
| `completed` | Call ended normally |
| `failed` | Call could not be completed |
| `busy` | Destination returned busy signal |
| `noAnswer` | Destination did not answer |

## Conference States

| Status | Description |
|--------|-------------|
| `empty` | Conference created, no participants |
| `populated` | Has participants but not started |
| `inProgress` | Active conference |
| `terminated` | Conference ended |

## SMS

- Maximum 160 characters per single SMS segment
- Longer messages are split into multiple segments automatically
- Both sender (`from`) and receiver (`to`) must be E.164 format
- Sender must be a FreeClimb number owned by the account
- SMS-enabled numbers are distinct from voice-enabled numbers (a number can be both)

## PQL (FreeClimb Query Language)

PQL is used to filter API logs. It supports field-based queries:

```
level = "ERROR"
requestUrl CONTAINS "/Calls"
timestamp > "2024-01-01"
```

Use PQL with the log filtering endpoint or the CLI's `logs:filter` command.

## API Pagination

List endpoints return paginated results. Each response includes:

```json
{
  "total": 150,
  "start": 0,
  "end": 99,
  "page": 0,
  "numPages": 2,
  "pageSize": 100,
  "nextPageUri": "/Accounts/{accountId}/Calls?cursor=..."
}
```

Use the `nextPageUri` to fetch subsequent pages. Keep all filter parameters identical across pages.


---

# PerCL Reference

PerCL (Performance Command Language) is FreeClimb's JSON-based language for controlling call flow. Your webhook server responds to FreeClimb's requests with PerCL commands that tell FreeClimb what to do next.

## Structure

PerCL is a JSON array of command objects. Each command has a single key (the command name) with an object value (the parameters):

```json
[
  { "Say": { "text": "Welcome to our service." } },
  { "Pause": { "length": 1000 } },
  { "Say": { "text": "Goodbye." } },
  { "Hangup": {} }
]
```

Commands execute sequentially. The call ends when:
- A `Hangup` command executes
- The caller hangs up
- A command redirects to a new URL (e.g., `Redirect`, `GetDigits` with `actionUrl`)

## Command Reference

### Speech & Audio

#### Say
Speak text using text-to-speech.

```json
{ "Say": { "text": "Hello, thank you for calling.", "loop": 1 } }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | yes | Text to speak |
| `loop` | integer | no | Number of times to repeat (default: 1) |

#### Play
Play a pre-recorded audio file.

```json
{ "Play": { "file": "https://example.com/greeting.wav" } }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | string | yes | URL of audio file (WAV or MP3) |

#### Pause
Pause for a duration.

```json
{ "Pause": { "length": 2000 } }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `length` | integer | yes | Pause duration in milliseconds |

### Input Collection

#### GetDigits
Collect DTMF key presses from the caller.

```json
{
  "GetDigits": {
    "actionUrl": "https://example.com/handle-digits",
    "prompts": [
      { "Say": { "text": "Press 1 for sales. Press 2 for support." } }
    ],
    "maxDigits": 1,
    "minDigits": 1,
    "initialTimeoutMs": 8000,
    "digitTimeoutMs": 5000,
    "finishOnKey": "#",
    "flushBuffer": true
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionUrl` | string | yes | URL to POST collected digits to |
| `prompts` | array | no | PerCL commands to play while waiting (Say or Play) |
| `maxDigits` | integer | no | Maximum digits to collect |
| `minDigits` | integer | no | Minimum digits required |
| `initialTimeoutMs` | integer | no | Time to wait for first digit (ms) |
| `digitTimeoutMs` | integer | no | Time between digits (ms) |
| `finishOnKey` | string | no | Key that ends input (e.g., `#`) |
| `flushBuffer` | boolean | no | Clear any buffered digits before collecting |

FreeClimb POSTs to `actionUrl` with `digits` in the request body.

#### GetSpeech
Collect speech input from the caller (speech recognition).

```json
{
  "GetSpeech": {
    "actionUrl": "https://example.com/handle-speech",
    "grammarFile": "https://example.com/grammar.grxml",
    "prompts": [
      { "Say": { "text": "Please say your account number." } }
    ]
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionUrl` | string | yes | URL to POST recognized speech to |
| `grammarFile` | string | yes | URL of speech recognition grammar (GRXML) |
| `prompts` | array | no | PerCL commands to play while listening |

### Call Flow Control

#### Redirect
End current PerCL execution and fetch new commands from a URL.

```json
{ "Redirect": { "actionUrl": "https://example.com/next-step" } }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionUrl` | string | yes | URL to fetch next PerCL commands from |

#### Hangup
End the call.

```json
{ "Hangup": {} }
```

No parameters.

#### SendDigits
Play DTMF tones into the call (useful for navigating automated systems).

```json
{ "SendDigits": { "digits": "1234#", "pauseMs": 500 } }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `digits` | string | yes | Digits to send (0-9, *, #) |
| `pauseMs` | integer | no | Pause between digits (ms) |

### Outbound & Transfer

#### OutDial
Make an outbound call to a third party (call transfer).

```json
{
  "OutDial": {
    "destination": "+15551234567",
    "callingNumber": "+15559876543",
    "actionUrl": "https://example.com/transfer-status",
    "callConnectUrl": "https://example.com/connected",
    "timeout": 30,
    "ifMachine": "hangup"
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `destination` | string | yes | Number to call (E.164) |
| `callingNumber` | string | yes | Caller ID number (must be owned) |
| `actionUrl` | string | yes | URL called when OutDial completes |
| `callConnectUrl` | string | yes | URL called when destination answers |
| `timeout` | integer | no | Ring timeout in seconds (default: 30) |
| `ifMachine` | string | no | `hangup` or `redirect` if machine detected |
| `privacyMode` | boolean | no | Mask digits in logs |

#### Sms
Send an SMS during a call.

```json
{
  "Sms": {
    "to": "+15551234567",
    "from": "+15559876543",
    "text": "Your confirmation code is 1234."
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | yes | Destination number (E.164) |
| `from` | string | yes | FreeClimb number (E.164, must be SMS-enabled) |
| `text` | string | yes | Message text |

### Recording

#### RecordUtterance
Record the caller's speech.

```json
{
  "RecordUtterance": {
    "actionUrl": "https://example.com/recording-saved",
    "silenceTimeoutMs": 5000,
    "maxLengthSec": 120,
    "finishOnKey": "#",
    "playBeep": true
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `actionUrl` | string | yes | URL called with recording details |
| `silenceTimeoutMs` | integer | no | Stop after this much silence (ms) |
| `maxLengthSec` | integer | no | Maximum recording length (seconds) |
| `finishOnKey` | string | no | Key to stop recording (e.g., `#`) |
| `playBeep` | boolean | no | Play beep before recording starts |

FreeClimb POSTs to `actionUrl` with `recordingUrl` and `recordingId`.

#### StartRecordCall
Record the entire call (both sides).

```json
{ "StartRecordCall": {} }
```

No parameters. Call recording continues until the call ends.

### Queue Operations

#### Enqueue
Place the current call into a queue.

```json
{
  "Enqueue": {
    "queueId": "QU1234567890abcdef",
    "waitUrl": "https://example.com/hold-music",
    "actionUrl": "https://example.com/dequeued"
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueId` | string | yes | Queue to place the call in |
| `waitUrl` | string | yes | URL that returns PerCL for hold experience |
| `actionUrl` | string | yes | URL called when call is dequeued |

#### Dequeue
Remove a call from a queue (typically called from agent-side logic).

```json
{ "Dequeue": {} }
```

### Conference Operations

#### AddToConference
Add the current call to a conference.

```json
{
  "AddToConference": {
    "conferenceId": "CF1234567890abcdef",
    "startConfOnEnter": true,
    "talk": true,
    "listen": true
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conferenceId` | string | yes | Conference to join |
| `startConfOnEnter` | boolean | no | Start conference when this participant joins |
| `talk` | boolean | no | Can this participant speak |
| `listen` | boolean | no | Can this participant hear |
| `leaveConferenceUrl` | string | no | URL called when participant leaves |
| `notificationUrl` | string | no | URL for conference event notifications |

#### CreateConference
Create a new conference and add the current call.

```json
{
  "CreateConference": {
    "actionUrl": "https://example.com/conference-status",
    "alias": "support-call-123",
    "playBeep": "always",
    "record": true,
    "statusCallbackUrl": "https://example.com/conf-events"
  }
}
```

#### RemoveFromConference
Remove the current call from its conference.

```json
{ "RemoveFromConference": {} }
```

#### SetListen / SetTalk
Control whether a participant can hear or speak.

```json
{ "SetListen": { "listen": false } }
{ "SetTalk": { "talk": false } }
```

## Common Patterns

### Greeting + Hangup

```json
[
  { "Say": { "text": "Thank you for calling. Goodbye." } },
  { "Hangup": {} }
]
```

### IVR Menu (Digit Collection)

```json
[
  {
    "GetDigits": {
      "actionUrl": "https://example.com/menu-handler",
      "prompts": [
        { "Say": { "text": "Press 1 for sales. Press 2 for support. Press 0 for an operator." } }
      ],
      "maxDigits": 1,
      "minDigits": 1,
      "initialTimeoutMs": 8000,
      "flushBuffer": true
    }
  }
]
```

### Voicemail

```json
[
  { "Say": { "text": "Please leave a message after the beep. Press pound when finished." } },
  {
    "RecordUtterance": {
      "actionUrl": "https://example.com/voicemail-saved",
      "silenceTimeoutMs": 5000,
      "maxLengthSec": 120,
      "finishOnKey": "#",
      "playBeep": true
    }
  }
]
```

### Call Transfer

```json
[
  { "Say": { "text": "Transferring your call. Please hold." } },
  {
    "OutDial": {
      "destination": "+15551234567",
      "callingNumber": "+15559876543",
      "actionUrl": "https://example.com/transfer-status",
      "callConnectUrl": "https://example.com/connected",
      "timeout": 30
    }
  }
]
```

### Queue a Caller

```json
[
  { "Say": { "text": "Please hold while we connect you with an agent." } },
  {
    "Enqueue": {
      "queueId": "QU1234567890abcdef",
      "waitUrl": "https://example.com/hold-music",
      "actionUrl": "https://example.com/dequeued"
    }
  }
]
```

### Record the Call

```json
[
  { "Say": { "text": "This call may be recorded for quality and training purposes." } },
  { "StartRecordCall": {} }
]
```

## Webhook Request Body

When FreeClimb calls your webhook, the POST body includes:

| Field | Description |
|-------|-------------|
| `accountId` | Your account ID |
| `callId` | The call ID |
| `callStatus` | Current call status |
| `from` | Caller's number (E.164) |
| `to` | Called number (E.164) |
| `direction` | `inbound` or `outboundAPI` |
| `digits` | Collected digits (after GetDigits) |
| `recordingUrl` | Recording URL (after RecordUtterance) |
| `recordingId` | Recording ID (after RecordUtterance) |
| `parentCallId` | Parent call ID (for OutDial legs) |
| `queueId` | Queue ID (for queue events) |
| `conferenceId` | Conference ID (for conference events) |


---

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


---

# Error Recovery Guide

FreeClimb error codes, troubleshooting strategies, and common mistakes.

## Error Code Reference

### Authentication (Codes 0, 50, 51)

| Code | Message | Fix |
|------|---------|-----|
| 0 | Service inaccessible or credentials invalid | Run `freeclimb login` or `freeclimb diagnose` |
| 50 | Login credentials may be incorrect | Re-authenticate with `freeclimb login` |
| 51 | Account credentials expired or invalid | Re-authenticate with `freeclimb login` |

**Credential priority**: Environment variables > OS keychain > .env file. If env vars are set, they override keychain credentials.

Docs: https://docs.freeclimb.com/docs/authentication

### Input Validation (Codes 1, 3, 5, 9)

| Code | Message | Fix |
|------|---------|-----|
| 1 | Typo or misspelling in command | Run `freeclimb --help` |
| 3 | Flags or arguments formatted incorrectly | Run `freeclimb [command] --help` |
| 5 | PQL query syntax error | Check PQL syntax |
| 9 | Phone number not in E.164 format | Use format: `+12223334444` |

Docs (PQL): https://docs.freeclimb.com/reference/logs#filter-logs

### Phone Number Errors (Codes 10, 11, 29, 46, 47, 76)

| Code | Message | Fix |
|------|---------|-----|
| 10 | Number is not SMS-enabled | Run `freeclimb available-numbers:list --smsEnabled true` |
| 11 | International numbers require account upgrade | Contact support |
| 29 | Outbound number not verified | Check `freeclimb incoming-numbers:list` |
| 46 | Number not found or not owned by account | Run `freeclimb incoming-numbers:list` |
| 47 | International access requires account upgrade | Contact support |
| 76 | Number limit reached for trial account | Upgrade account |

Dashboard: https://freeclimb.com/dashboard
Pricing: https://freeclimb.com/pricing

### Call & Conference Errors (Codes 15-20, 56, 62, 66)

| Code | Message | Fix |
|------|---------|-----|
| 15 | Failed to create calling number (internal) | Retry the command |
| 16 | Failed to create call (internal) | Run `freeclimb diagnose`, then retry |
| 17 | Failed to update call (internal) | Check call status with `freeclimb calls:get <callId>` |
| 18 | Failed to update conference participant (internal) | List participants: `freeclimb conference-participants:list <confId>` |
| 19 | Failed to hang up participant (internal) | Retry |
| 20 | Failed to remove participant from conference (internal) | List participants: `freeclimb conference-participants:list <confId>` |
| 56 | Call is currently in a conference | Wait for conference to end, or list: `freeclimb conferences:list` |
| 62 | Failed to create conference (internal) | List conferences: `freeclimb conferences:list` |
| 66 | Conference or call ID not found | Verify ID: `freeclimb conferences:list` or `freeclimb calls:list` |

### Queue Errors (Codes 59, 67)

| Code | Message | Fix |
|------|---------|-----|
| 59 | Failed to create queue (internal) | List queues: `freeclimb call-queues:list` |
| 67 | Failed to add member to queue (internal) | List members: `freeclimb queue-members:list <queueId>` |

### Recording Errors (Codes 68, 69)

| Code | Message | Fix |
|------|---------|-----|
| 68 | Recording not found | List recordings: `freeclimb recordings:list` |
| 69 | Recording file URL returned empty response | Get details: `freeclimb recordings:get <recordingId>` |

### Account Errors (Codes 6, 27, 43, 44)

| Code | Message | Fix |
|------|---------|-----|
| 6 | Account profile incomplete | Complete at https://freeclimb.com/dashboard/portal/account/profile |
| 27 | Trial account features conflict with upgraded account | Check dashboard |
| 43 | Account type not recognized (internal) | Contact support |
| 44 | Account status not recognized (internal) | Contact support |

### Rate Limiting (Code 24)

| Code | Message | Fix |
|------|---------|-----|
| 24 | Rate limit exceeded | Wait a moment and retry |

### Server & Resource Errors (Codes 30, 31, 49, 55, 61, 77)

| Code | Message | Fix |
|------|---------|-----|
| 30 | Contact support | https://support.freeclimb.com |
| 31 | Unexpected error | https://support.freeclimb.com |
| 49 | Contact support | https://support.freeclimb.com |
| 55 | Server temporarily unavailable | Run `freeclimb diagnose`, retry in a few minutes |
| 61 | Resource ID conflict (internal) | https://support.freeclimb.com |
| 77 | Resource has been deleted | Resource no longer available |

## Common Agent Mistakes

### 1. Using wrong phone number format
Phone numbers must be E.164: `+15551234567`. Do not use `(555) 123-4567`, `555-123-4567`, or `5551234567`.

### 2. Making outbound calls without an application
Outbound calls require either:
- `applicationId` (recommended)
- `callConnectUrl` (alternative)

Without one of these, FreeClimb doesn't know what PerCL to execute when the call connects.

### 3. Calling unverified numbers on trial accounts
Trial accounts can only call numbers verified in the dashboard. Calling unverified numbers returns error code 29.

### 4. Forgetting to use `--dry-run` before mutations
Always preview mutating operations (`create`, `update`, `delete`, `buy`) with `--dry-run` before executing. `incoming-numbers:buy` is immediate and non-reversible.

### 5. Using numbers without SMS capability for SMS
Not all phone numbers support SMS. Check with `freeclimb incoming-numbers:list` and look for SMS-enabled numbers, or search specifically: `freeclimb available-numbers:list --smsEnabled true`.

### 6. Paginating with changed filters
If you change filter parameters between pagination requests, the cursor resets. Keep all filters identical when paginating.

### 7. Assuming `--fields` typos cause errors
The `--fields` flag silently returns empty for misspelled field names. Verify field names with `freeclimb describe <command>`.

## Diagnostic Workflow

When something isn't working:

```bash
# 1. Check credentials and connectivity
freeclimb diagnose

# 2. Check account status
freeclimb status

# 3. Check recent logs for errors
freeclimb logs:filter --pql 'level = "ERROR"' --json

# 4. Check specific resource
freeclimb calls:get <callId> --json
freeclimb applications:get <appId> --json

# 5. Verify number assignment
freeclimb incoming-numbers:list --fields phoneNumber,applicationId --json
```


---

# FreeClimb CLI

## Setup

```bash
export FREECLIMB_ACCOUNT_ID=<account_id>
export FREECLIMB_API_KEY=<api_key>
export FREECLIMB_OUTPUT_FORMAT=json
```

## Gotchas

1. **`--dry-run` on GET commands is a no-op** — it only works on POST/PUT/DELETE. Don't assume it validates reads.
2. **`--fields` with a typo silently returns the field as empty, not an error** — verify field names with `freeclimb describe <command>`.
3. **`--next` pagination resets if you change any filter parameter between pages** — keep filters identical across pages.
4. **`freeclimb describe` returns the CLI schema, NOT the API schema** — they can differ on optional fields and naming.
5. **`incoming-numbers:buy` is immediate and non-reversible** — there's no undo. Always `--dry-run` first.
6. **`api` command with `--raw` bypasses all validation** — agent inputs are NOT sanitized in raw mode.
7. **Always `--dry-run` before mutating operations** (create/update/delete) and confirm with the user before executing.
8. **Always `--fields` on list commands** to limit response size and protect context windows.
9. **Phone numbers must be E.164 format**: `+12223334444`

## Schema Discovery

```bash
freeclimb describe              # List all topics
freeclimb describe calls        # Commands in a topic
freeclimb describe calls:list   # Full schema for one command
freeclimb describe --all        # Every command's schema
```

## Key Flags

| Flag             | Effect                              |
| ---------------- | ----------------------------------- |
| `--json`         | Force JSON output                   |
| `--fields f1,f2` | Limit response fields               |
| `--dry-run`      | Validate without executing          |
| `--raw`          | Raw API response (api command only) |
| `--quiet`        | Output only resource IDs            |
| `--next`         | Fetch next page of results          |

## Common Workflows

### SMS

```bash
freeclimb sms:send +1FROM +1TO "message" --dry-run
freeclimb sms:send +1FROM +1TO "message"
freeclimb sms:list --fields messageId,from,to,status --json
```

### Calls

```bash
freeclimb calls:make +1FROM +1TO APP_ID --dry-run
freeclimb calls:make +1FROM +1TO APP_ID
freeclimb calls:list --fields callId,status,from,to,dateCreated --json
```

### Applications

```bash
freeclimb applications:list --fields applicationId,alias --json
freeclimb applications:create --alias "MyApp" --voiceUrl "https://example.com/voice" --dry-run
freeclimb applications:create --alias "MyApp" --voiceUrl "https://example.com/voice"
```

### Numbers

```bash
freeclimb available-numbers:list --fields phoneNumber,region --json
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --dry-run
freeclimb incoming-numbers:list --fields phoneNumberId,phoneNumber,alias --json
```

### Conferences

```bash
freeclimb conferences:create --alias "standup" --dry-run
freeclimb conference-participants:list CONF_ID --fields callId,talk,listen --json
```

### Raw API

```bash
freeclimb api /Calls --fields callId,status
freeclimb api /Messages --method POST -d '{"to":"+15551234567","from":"+15559876543","text":"Hello"}'
freeclimb api /Calls -p status=completed -p to=+15551234567
```

### Account & Diagnostics

```bash
freeclimb accounts:get --json
freeclimb diagnose
freeclimb status
```

## MCP Integration

For structured JSON-RPC invocation (eliminates shell escaping):

```bash
freeclimb mcp:start
freeclimb mcp:config  # Print MCP client config
```

## Pagination

```bash
freeclimb calls:list --json          # First page
freeclimb calls:list --next --json   # Next page
```

## Error Handling

JSON-mode errors include structured suggestions:

```json
{
    "success": false,
    "error": { "code": 3, "message": "...", "suggestion": "..." }
}
```

## Input Validation

The CLI rejects:

- Control characters (below ASCII 0x20) in string inputs
- Path traversal (`../`) in resource IDs
- Query parameters (`?`, `#`) embedded in IDs
- Pre-URL-encoded values (`%`) in IDs

## Quick Provisioning Workflow

```bash
# 1. Create the application
freeclimb applications:create --alias "My App" --voiceUrl "https://your-server.com/voice" --dry-run
freeclimb applications:create --alias "My App" --voiceUrl "https://your-server.com/voice"

# 2. Find an available number
freeclimb available-numbers:list --fields phoneNumber,region --json

# 3. Buy and assign it
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --applicationId "AP..." --dry-run
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --applicationId "AP..."

# 4. Verify
freeclimb applications:list --fields applicationId,alias,voiceUrl --json
freeclimb incoming-numbers:list --fields phoneNumber,applicationId --json
```

## Companion Skills

| Skill | Use For |
| ----- | ------- |
| Platform Concepts | FreeClimb fundamentals, resource model, webhooks |
| PerCL Reference | Call flow command language |
| Voice Applications | Building IVR, call centers, voicemail |
| Error Recovery | Troubleshooting and error codes |
| CLI Workflows | Multi-step operational recipes |
| MCP Tools | AI agent tool reference |


---

# CLI Workflows

Multi-step operational recipes for common FreeClimb tasks.

## Full Onboarding (New Account Setup)

```bash
# 1. Authenticate
freeclimb login

# 2. Verify account is working
freeclimb diagnose
freeclimb status

# 3. Create an application with webhook URLs
freeclimb applications:create \
  --alias "My Voice App" \
  --voiceUrl "https://your-server.com/voice" \
  --smsUrl "https://your-server.com/sms" \
  --statusCallbackUrl "https://your-server.com/status" \
  --dry-run

freeclimb applications:create \
  --alias "My Voice App" \
  --voiceUrl "https://your-server.com/voice" \
  --smsUrl "https://your-server.com/sms" \
  --statusCallbackUrl "https://your-server.com/status"
# Note the Application ID (AP...) from the output

# 4. Find and buy a phone number
freeclimb available-numbers:list --fields phoneNumber,region --json
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --applicationId "AP..." --dry-run
freeclimb incoming-numbers:buy --phoneNumber "+15551234567" --applicationId "AP..."

# 5. Verify everything is connected
freeclimb applications:list --fields applicationId,alias,voiceUrl --json
freeclimb incoming-numbers:list --fields phoneNumber,applicationId --json

# 6. Test with a call or SMS
freeclimb calls:make +1YOUR_NUMBER +1DEST_NUMBER AP... --dry-run
freeclimb sms:send +1YOUR_NUMBER +1DEST_NUMBER "Hello from FreeClimb!" --dry-run
```

## Debug a Failed Call

```bash
# 1. Get the call details
freeclimb calls:get CA_CALL_ID --json

# 2. Check the status — look at callStatus, duration, from, to
# If status is "failed", "busy", or "noAnswer", the issue is at the carrier level

# 3. Check logs for the specific call
freeclimb logs:filter --pql 'callId = "CA_CALL_ID"' --json

# 4. Check for error-level logs
freeclimb logs:filter --pql 'level = "ERROR"' --json

# 5. Verify the application's webhook URLs are reachable
freeclimb applications:get AP_APP_ID --fields voiceUrl,callConnectUrl,statusCallbackUrl --json

# 6. Verify the phone number is assigned to the correct application
freeclimb incoming-numbers:list --fields phoneNumber,applicationId --json

# 7. Run full diagnostics
freeclimb diagnose
```

## Migrate an Application to New Webhook URLs

```bash
# 1. Check current configuration
freeclimb applications:get AP_APP_ID --json

# 2. Preview the update
freeclimb applications:update AP_APP_ID \
  --voiceUrl "https://new-server.com/voice" \
  --smsUrl "https://new-server.com/sms" \
  --statusCallbackUrl "https://new-server.com/status" \
  --dry-run

# 3. Apply the update
freeclimb applications:update AP_APP_ID \
  --voiceUrl "https://new-server.com/voice" \
  --smsUrl "https://new-server.com/sms" \
  --statusCallbackUrl "https://new-server.com/status"

# 4. Verify
freeclimb applications:get AP_APP_ID --fields voiceUrl,smsUrl,statusCallbackUrl --json
```

## Bulk Export: All Calls

```bash
# Page through all calls
freeclimb calls:list --fields callId,status,from,to,dateCreated,duration --json > calls_page1.json

# Continue until no more pages
freeclimb calls:list --next --fields callId,status,from,to,dateCreated,duration --json > calls_page2.json
freeclimb calls:list --next --fields callId,status,from,to,dateCreated,duration --json > calls_page3.json
# ... repeat until empty results
```

## Audit Phone Number Assignments

```bash
# List all numbers with their application assignments
freeclimb incoming-numbers:list --fields phoneNumber,phoneNumberId,applicationId,alias --json

# Cross-reference with applications
freeclimb applications:list --fields applicationId,alias,voiceUrl --json

# Find unassigned numbers (applicationId will be empty)
# Find numbers pointing to stale applications
```

## Monitor Active Calls

```bash
# List currently active calls
freeclimb calls:list --status inProgress --fields callId,from,to,dateCreated --json

# List calls in queues
freeclimb call-queues:list --json
freeclimb queue-members:list QU_QUEUE_ID --json

# List active conferences
freeclimb conferences:list --status inProgress --json
```

## Clean Up Test Resources

```bash
# List and review test applications
freeclimb applications:list --fields applicationId,alias --json

# Delete test applications (confirm each one)
freeclimb applications:delete AP_TEST_ID --dry-run
freeclimb applications:delete AP_TEST_ID

# Release test phone numbers
freeclimb incoming-numbers:list --fields phoneNumberId,phoneNumber,alias --json
freeclimb incoming-numbers:delete PN_TEST_ID --dry-run
freeclimb incoming-numbers:delete PN_TEST_ID
```

## Raw API Access (Advanced)

For operations not covered by named commands:

```bash
# GET with query parameters
freeclimb api /Calls -p status=completed -p to=+15551234567 --fields callId,status

# POST with JSON body
freeclimb api /Messages --method POST \
  -d '{"to":"+15551234567","from":"+15559876543","text":"Test"}'

# PUT to update a resource
freeclimb api /Applications/AP_ID --method PUT \
  -d '{"alias":"Updated Name"}'

# Always use --dry-run first for mutations
freeclimb api /Messages --method POST \
  -d '{"to":"+15551234567","from":"+15559876543","text":"Test"}' \
  --dry-run
```


---

# FreeClimb MCP Tools Reference

The FreeClimb CLI includes a built-in MCP (Model Context Protocol) server that exposes 19 tools for AI agents. Start it with:

```bash
freeclimb mcp:start
```

## Setup

Configure any MCP-compatible client (Claude Desktop, Cursor, Copilot, or custom agents) with:

```json
{
  "mcpServers": {
    "freeclimb": {
      "command": "freeclimb",
      "args": ["mcp", "start"],
      "env": {
        "FREECLIMB_ACCOUNT_ID": "<YOUR_ACCOUNT_ID>",
        "FREECLIMB_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

Or generate the config: `freeclimb mcp:config`

## Tools

### Call Management

#### make_call
Make an outbound phone call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | yes | Destination number (E.164) |
| `from` | string | yes | FreeClimb number (E.164) |
| `applicationId` | string | yes | Application to handle the call |
| `timeout` | number | no | Ring timeout in seconds (default: 30) |

#### list_calls
List recent calls with optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | no | Filter: queued, ringing, inProgress, canceled, completed, failed, busy, noAnswer |
| `to` | string | no | Filter by destination number |
| `from` | string | no | Filter by source number |

#### get_call
Get details for a specific call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callId` | string | yes | The call ID |

#### update_call
Update an active call (hang up or cancel).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callId` | string | yes | The call ID |
| `status` | string | yes | `completed` (hang up) or `canceled` |

### SMS Management

#### send_sms
Send an SMS message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | yes | Destination number (E.164) |
| `from` | string | yes | FreeClimb number (E.164, SMS-enabled) |
| `text` | string | yes | Message text (max 160 chars for single SMS) |

#### list_sms
List recent SMS messages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string | no | Filter by destination number |
| `from` | string | no | Filter by source number |

#### get_sms
Get details for a specific message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageId` | string | yes | The message ID |

### Phone Number Management

#### list_numbers
List all phone numbers owned by the account. No parameters.

#### get_number
Get details for a specific phone number.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberId` | string | yes | The phone number ID |

#### search_available_numbers
Search for numbers available to purchase.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `areaCode` | string | no | Filter by area code (e.g., 415) |
| `country` | string | no | Two-letter country code (default: US) |
| `smsEnabled` | boolean | no | Filter for SMS-enabled numbers |
| `voiceEnabled` | boolean | no | Filter for voice-enabled numbers |

### Application Management

#### list_applications
List all applications. No parameters.

#### get_application
Get details for a specific application.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationId` | string | yes | The application ID |

### Account & Logging

#### get_account
Get account information and status. No parameters.

#### list_logs
List recent account logs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `maxItems` | number | no | Max entries to return (default: 100) |

#### filter_logs
Filter logs using PQL (FreeClimb Query Language).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pql` | string | yes | PQL query (e.g., `level = "ERROR"`) |
| `maxItems` | number | no | Max entries to return |

### Infrastructure

#### list_recordings
List recordings, optionally filtered by call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callId` | string | no | Filter by call ID |

#### list_conferences
List conferences, optionally filtered by status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | no | Filter: empty, populated, inProgress, terminated |

#### list_queues
List all call queues. No parameters.

### PerCL Generation

#### generate_percl
Generate valid PerCL JSON for common call flow patterns. Returns a PerCL command array.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | yes | Pattern: greeting, menu, voicemail, transfer, queue, record |
| `text` | string | no | Text for Say commands |
| `actionUrl` | string | no | Webhook URL for callbacks |
| `options` | object | no | Pattern-specific: `destination`, `callingNumber`, `queueId`, `waitUrl`, `maxDigits`, `finishOnKey`, `maxLengthSec` |

## Resources

The MCP server exposes resources (read-only data) via ListResources/ReadResource:

### API Resources

| URI | Description | Type |
|-----|-------------|------|
| `freeclimb://account` | Current account info and status | JSON |
| `freeclimb://numbers` | All owned phone numbers | JSON |
| `freeclimb://applications` | All configured applications | JSON |

### Skill Resources

Domain knowledge documents discoverable at runtime. Any MCP client can read these to gain FreeClimb expertise:

| URI | Description | Type |
|-----|-------------|------|
| `freeclimb://skills/freeclimb-platform-concepts` | Account model, resources, webhooks | Markdown |
| `freeclimb://skills/freeclimb-percl-reference` | PerCL command language reference | Markdown |
| `freeclimb://skills/freeclimb-voice-applications` | Voice app patterns (IVR, call center) | Markdown |
| `freeclimb://skills/freeclimb-error-recovery` | Error codes and troubleshooting | Markdown |
| `freeclimb://skills/freeclimb-cli-usage` | CLI commands and flags | Markdown |
| `freeclimb://skills/freeclimb-cli-workflows` | Multi-step operational recipes | Markdown |
| `freeclimb://skills/freeclimb-mcp-tools` | This document (MCP tool reference) | Markdown |

Use `ListResources` to discover all available skills, then `ReadResource` to load any skill by URI.

## Prompts

Pre-built prompt templates:

| Name | Description | Arguments |
|------|-------------|-----------|
| `send-sms` | Guide through sending SMS | `to` (required), `message` (required) |
| `make-call` | Guide through making a call | `to` (required), `applicationId` (required) |
| `diagnose` | Run CLI diagnostics | None |


---
