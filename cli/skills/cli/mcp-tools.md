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
