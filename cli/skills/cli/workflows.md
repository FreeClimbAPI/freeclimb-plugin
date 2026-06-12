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
