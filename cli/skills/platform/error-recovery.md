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
