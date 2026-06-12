`freeclimb logs`
================

A Log instance resource represents a log entry made by FreeClimb in the course of processing a PerCL script or servicing a REST API request. It is mostly useful for debugging purposes. The Logs list resource represents the set of logs generated for an account.

* [`freeclimb logs:filter PQL`](#freeclimb-logsfilter-pql)
* [`freeclimb logs:list`](#freeclimb-logslist)

## `freeclimb logs:filter PQL`

Returns the first page of Logs associated with the specified account.

```
USAGE
  $ freeclimb logs:filter PQL [-m <value>] [-q <value>] [-Q <value> -t] [-n] [--json] [--quiet] [--fields
    <value>] [--dry-run] [-h]

ARGUMENTS
  PQL  The filter query for retrieving logs.

FLAGS
  -Q, --since=<value>    Determines time frame of logs to be printed out before starting tail. Ex.2h9m
  -h, --help             Show CLI help.
  -m, --maxItem=<value>  Show only a certain number of the most recent logs on this page.
  -n, --next             Displays the next page of output.
  -q, --sleep=<value>    [default: 1000] Determines time waited between request for tail command. Defaults at 1 second.
  -t, --tail             Polls the FreeClimb API to retrieve and display new logs as they occur.
      --dry-run          Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>   Comma-separated list of fields to include in the response. Limits output to protect context
                         windows when used by agents.
      --json             Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet            Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Returns the first page of Logs associated with the specified account.

EXAMPLES
  $ freeclimb logs:filter "level = 'ERROR'"

  $ freeclimb logs:filter "level = 'WARNING'" --json

  $ freeclimb logs:filter "level = 'INFO'" --tail
```

_See code: [src/commands/logs/filter.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/logs/filter.ts)_

## `freeclimb logs:list`

Returns all Logs associated with the specified account or a specific page of Logs as indicated by the URI in the request.

```
USAGE
  $ freeclimb logs:list [-m <value>] [-q <value>] [-Q <value> -t] [-n] [--json] [--quiet] [--fields <value>]
    [-h]

FLAGS
  -Q, --since=<value>    Determines time frame of logs to be printed out before starting tail. Ex.2h9m
  -h, --help             Show CLI help.
  -m, --maxItem=<value>  Show only a certain number of the most recent logs on this page.
  -n, --next             Displays the next page of output.
  -q, --sleep=<value>    [default: 1000] Determines time waited between request for tail command. Defaults at 1 second.
  -t, --tail             Polls the FreeClimb API to retrieve and display new logs as they occur.
      --fields=<value>   Comma-separated list of fields to include in the response. Limits output to protect context
                         windows when used by agents.
      --json             Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet            Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Returns all Logs associated with the specified account or a specific page of Logs as indicated by the URI in the
  request.

EXAMPLES
  $ freeclimb logs:list

  $ freeclimb logs:list --json

  $ freeclimb logs:list --tail
```

_See code: [src/commands/logs/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/logs/list.ts)_
