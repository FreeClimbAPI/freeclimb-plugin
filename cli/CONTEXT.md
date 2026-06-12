# FreeClimb CLI - Context for AI Agents

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
