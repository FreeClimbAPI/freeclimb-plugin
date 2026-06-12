`freeclimb api`
===============

Make authenticated API requests to FreeClimb.

This command allows you to make raw API requests with automatic
authentication. Useful for accessing endpoints not covered by
other CLI commands. Accepts the full API payload via --data as JSON.

The endpoint can be:
  - A path starting with / (e.g., /Calls) - recommended
  - A full FreeClimb URL (e.g., https://www.freeclimb.com/apiserver/Accounts/.../Calls)

For account-scoped endpoints, the account ID is automatically included.
Full URLs are restricted to FreeClimb domains for credential safety.

* [`freeclimb api [ENDPOINT]`](#freeclimb-api-endpoint)

## `freeclimb api [ENDPOINT]`

Make authenticated API requests to FreeClimb.

```
USAGE
  $ freeclimb api [ENDPOINT] [-X GET|POST|PUT|DELETE] [-d <value>] [--stdin] [-p <value>...] [--fields
    <value>] [--json] [--raw] [--dry-run] [-h]

ARGUMENTS
  [ENDPOINT]  API endpoint path (e.g., /Calls, /Messages)

FLAGS
  -X, --method=<option>   [default: GET] HTTP method
                          <options: GET|POST|PUT|DELETE>
  -d, --data=<value>      JSON data for POST/PUT requests (accepts full API payload)
  -h, --help              Show CLI help.
  -p, --param=<value>...  Query parameter (format: key=value, can be repeated)
      --dry-run           Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>    Comma-separated list of fields to include in the response. Limits output to protect context
                          windows when used by agents.
      --json              Output as structured JSON. Also enabled via FREECLIMB_OUTPUT_FORMAT=json env var.
      --raw               Output raw response without wrapping
      --stdin             Read JSON request body from stdin instead of --data flag

DESCRIPTION
  Make authenticated API requests to FreeClimb.

  This command allows you to make raw API requests with automatic
  authentication. Useful for accessing endpoints not covered by
  other CLI commands. Accepts the full API payload via --data as JSON.

  The endpoint can be:
  - A path starting with / (e.g., /Calls) - recommended
  - A full FreeClimb URL (e.g., https://www.freeclimb.com/apiserver/Accounts/.../Calls)

  For account-scoped endpoints, the account ID is automatically included.
  Full URLs are restricted to FreeClimb domains for credential safety.


EXAMPLES
  $ freeclimb api /Calls

  $ freeclimb api /Calls --method GET

  $ freeclimb api /Calls -p status=completed -p to=+15551234567

  $ freeclimb api /Messages --method POST -d '{"to":"+15551234567","from":"+15559876543","text":"Hello"}'

  $ freeclimb api /IncomingPhoneNumbers --json

  $ freeclimb api /Calls --fields callId,status,from,to

  $ freeclimb api /Messages --method POST --dry-run -d '{"to":"+15551234567"}'

  $ echo '{"to":"+15551234567","from":"+15559876543","text":"Hello"}' | freeclimb api /Messages --method POST --stdin
```

_See code: [src/commands/api.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/api.ts)_
