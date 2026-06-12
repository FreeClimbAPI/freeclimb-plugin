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
