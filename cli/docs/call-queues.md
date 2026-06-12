`freeclimb call-queues`
=======================

Queues are the primary means of keeping callers waiting. Queues can be created ahead of time and are deleted automatically when they change state from populated to empty.

* [`freeclimb call-queues:create`](#freeclimb-call-queuescreate)
* [`freeclimb call-queues:get QUEUEID`](#freeclimb-call-queuesget-queueid)
* [`freeclimb call-queues:list`](#freeclimb-call-queueslist)
* [`freeclimb call-queues:update QUEUEID`](#freeclimb-call-queuesupdate-queueid)

## `freeclimb call-queues:create`

Create a Queue within the specified account.

```
USAGE
  $ freeclimb call-queues:create [-a <value>] [-M <value>] [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

FLAGS
  -M, --maxSize=<value>  Maximum number of Calls this queue can hold. Default is 1000. Maximum is 1000.
  -a, --alias=<value>    A description for this Queue. Max length is 64 characters.
  -h, --help             Show CLI help.
      --dry-run          Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>   Comma-separated list of fields to include in the response. Limits output to protect context
                         windows when used by agents.
      --json             Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet            Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Create a Queue within the specified account.

EXAMPLES
  $ freeclimb call-queues:create --alias "Support Queue"

  $ freeclimb call-queues:create --alias "Support Queue" --maxSize 100 --dry-run
```

_See code: [src/commands/call-queues/create.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/call-queues/create.ts)_

## `freeclimb call-queues:get QUEUEID`

Retrieve a representation of the specified Queue.

```
USAGE
  $ freeclimb call-queues:get QUEUEID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  QUEUEID  A string that uniquely identifies this queue resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a representation of the specified Queue.

EXAMPLES
  $ freeclimb call-queues:get QU1234567890abcdef

  $ freeclimb call-queues:get QU1234567890abcdef --json
```

_See code: [src/commands/call-queues/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/call-queues/get.ts)_

## `freeclimb call-queues:list`

Retrieve a list of active Queues associated with the specified account.

```
USAGE
  $ freeclimb call-queues:list [-a <value>] [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -a, --alias=<value>   Return only the Queue resources with aliases that exactly match this name.
  -h, --help            Show CLI help.
  -n, --next            Displays the next page of output.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a list of active Queues associated with the specified account.

EXAMPLES
  $ freeclimb call-queues:list

  $ freeclimb call-queues:list --json

  $ freeclimb call-queues:list --quiet
```

_See code: [src/commands/call-queues/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/call-queues/list.ts)_

## `freeclimb call-queues:update QUEUEID`

Update the properties of the specified queue.

```
USAGE
  $ freeclimb call-queues:update QUEUEID [-a <value>] [-M <value>] [--json] [--quiet] [--fields <value>] [--dry-run]
  [-h]

ARGUMENTS
  QUEUEID  A string that uniquely identifies this Queue resource.

FLAGS
  -M, --maxSize=<value>  Maximum number of calls this queue can hold. Default is 100. Maximum is 1000. Note: Reducing
                         the maxSize of a Queue causes the Queue to reject incoming requests until it shrinks below the
                         new value of maxSize.
  -a, --alias=<value>    Description for this Queue. Max length is 64 characters.
  -h, --help             Show CLI help.
      --dry-run          Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>   Comma-separated list of fields to include in the response. Limits output to protect context
                         windows when used by agents.
      --json             Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet            Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Update the properties of the specified queue.

EXAMPLES
  $ freeclimb call-queues:update QU1234567890abcdef --alias "Renamed Queue"

  $ freeclimb call-queues:update QU1234567890abcdef --maxSize 50 --dry-run
```

_See code: [src/commands/call-queues/update.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/call-queues/update.ts)_
