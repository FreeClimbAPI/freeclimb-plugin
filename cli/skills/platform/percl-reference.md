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
