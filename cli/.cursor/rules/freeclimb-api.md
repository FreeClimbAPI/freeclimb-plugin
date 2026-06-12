# FreeClimb CLI

## Setup

```bash
export FREECLIMB_ACCOUNT_ID=<account_id>
export FREECLIMB_API_KEY=<api_key>
export FREECLIMB_OUTPUT_FORMAT=json
```

## Safety Rules

1. **Always** `--dry-run` before mutating operations (create/update/delete)
2. **Always** confirm with the user before executing writes or deletes
3. **Always** `--fields` on list commands to limit response size
4. **Always** `freeclimb describe` for schema introspection (not `--help`)
5. Phone numbers in E.164 format: `+12223334444`

## Schema Discovery

```bash
freeclimb describe              # List all topics
freeclimb describe calls        # Commands in a topic
freeclimb describe calls:list   # Full schema for one command
freeclimb describe --all        # Every command's schema
```

## Key Flags

| Flag | Effect |
|------|--------|
| `--json` | Force JSON output |
| `--fields f1,f2` | Limit response fields |
| `--dry-run` | Validate without executing |
| `--raw` | Raw API response (api command only) |

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
  "error": {"code": 3, "message": "...", "suggestion": "..."}
}
```

## Input Validation

The CLI rejects:
- Control characters (below ASCII 0x20) in string inputs
- Path traversal (`../`) in resource IDs
- Query parameters (`?`, `#`) embedded in IDs
- Pre-URL-encoded values (`%`) in IDs
