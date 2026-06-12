`freeclimb applications`
========================

An Application in FreeClimb is just a set of configuration data and URLs that FreeClimb invokes to notify the app of an event or to retrieve instructions on how to behave in response to an event, such as when one of the phone numbers associated with the Application receives a Call.

* [`freeclimb applications:create`](#freeclimb-applicationscreate)
* [`freeclimb applications:delete APPLICATIONID`](#freeclimb-applicationsdelete-applicationid)
* [`freeclimb applications:get APPLICATIONID`](#freeclimb-applicationsget-applicationid)
* [`freeclimb applications:list`](#freeclimb-applicationslist)
* [`freeclimb applications:update APPLICATIONID`](#freeclimb-applicationsupdate-applicationid)

## `freeclimb applications:create`

Create a new Application within the specified account.

```
USAGE
  $ freeclimb applications:create [-a <value>] [-v <value>] [-V <value>] [-c <value>] [-s <value>] [-u <value>] [-F
    <value>] [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

FLAGS
  -F, --smsFallbackUrl=<value>     URL that FreeClimb will request if it times out waiting for a response from the
                                   smsUrl. Used for inbound SMS only. Note: Any PerCL returned will be ignored.
  -V, --voiceFallbackUrl=<value>   URL that FreeClimb will request if it times out waiting for a response from the
                                   voiceUrl. Used for inbound calls only. Note: A PerCL response is expected to control
                                   the inbound call.
  -a, --alias=<value>              Description of the new application (maximum 64 characters).
  -c, --callConnectUrl=<value>     URL that FreeClimb will request when an outbound call request is complete. Used for
                                   outbound calls only. Note: A PerCL response is expected if the outbound call is
                                   connected (status=InProgress) to control the call.
  -h, --help                       Show CLI help.
  -s, --statusCallbackUrl=<value>  URL that FreeClimb will request to pass call status (such as call ended) to the
                                   application. Note: This is a notification only; any PerCL returned will be ignored.
  -u, --smsUrl=<value>             URL that FreeClimb will request when a phone number assigned to this application
                                   receives an incoming SMS message. Used for inbound SMS only. Note: Any PerCL returned
                                   will be ignored.
  -v, --voiceUrl=<value>           URL that FreeClimb should request when an inbound call arrives on a phone number
                                   assigned to this application. Used only for inbound calls. Note: A PerCL response is
                                   expected to control the inbound call.
      --dry-run                    Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>             Comma-separated list of fields to include in the response. Limits output to protect
                                   context windows when used by agents.
      --json                       Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json
                                   is set.
      --quiet                      Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Create a new Application within the specified account.

EXAMPLES
  $ freeclimb applications:create --alias "My App" --voiceUrl https://example.com/voice

  $ freeclimb applications:create --json

  $ freeclimb applications:create --dry-run --alias test
```

_See code: [src/commands/applications/create.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/applications/create.ts)_

## `freeclimb applications:delete APPLICATIONID`

Delete the specified application. If this application's ID is assigned to any Incoming phone number, that relationship will be cleared.

```
USAGE
  $ freeclimb applications:delete APPLICATIONID [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  APPLICATIONID  String that uniquely identifies this application resource.

FLAGS
  -h, --help            Show CLI help.
      --dry-run         Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Delete the specified application. If this application's ID is assigned to any Incoming phone number, that relationship
  will be cleared.

EXAMPLES
  $ freeclimb applications:delete AP1234567890abcdef1234567890abcdef12345678

  $ freeclimb applications:delete AP1234567890abcdef1234567890abcdef12345678 --dry-run
```

_See code: [src/commands/applications/delete.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/applications/delete.ts)_

## `freeclimb applications:get APPLICATIONID`

Retrieve a representation of the specified application.

```
USAGE
  $ freeclimb applications:get APPLICATIONID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  APPLICATIONID  A string that uniquely identifies this application resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a representation of the specified application.

EXAMPLES
  $ freeclimb applications:get AP1234567890abcdef1234567890abcdef12345678

  $ freeclimb applications:get AP1234567890abcdef1234567890abcdef12345678 --json

  $ freeclimb applications:get AP1234567890abcdef1234567890abcdef12345678 --fields applicationId,alias,voiceUrl
```

_See code: [src/commands/applications/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/applications/get.ts)_

## `freeclimb applications:list`

Retrieve a list of Applications associated with the specified account, sorted from latest created to oldest.

```
USAGE
  $ freeclimb applications:list [-a <value>] [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -a, --alias=<value>   Return only applications with aliases that exactly match this value.
  -h, --help            Show CLI help.
  -n, --next            Displays the next page of output.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a list of Applications associated with the specified account, sorted from latest created to oldest.

EXAMPLES
  $ freeclimb applications:list

  $ freeclimb applications:list --json

  $ freeclimb applications:list --quiet

  $ freeclimb applications:list --fields applicationId,alias
```

_See code: [src/commands/applications/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/applications/list.ts)_

## `freeclimb applications:update APPLICATIONID`

Update the properties of the specified application.

```
USAGE
  $ freeclimb applications:update APPLICATIONID [-a <value>] [-v <value>] [-V <value>] [-c <value>] [-s <value>] [-u
    <value>] [-F <value>] [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  APPLICATIONID  A string that uniquely identifies this application resource.

FLAGS
  -F, --smsFallbackUrl=<value>     The URL that FreeClimb will request if it times out waiting for a response from the
                                   smsUrl. Used for inbound SMS only. Note: Any PerCL returned will be ignored.
  -V, --voiceFallbackUrl=<value>   The URL that FreeClimb will request if it times out waiting for a response from the
                                   voiceUrl. Used for inbound calls only. Note: A PerCL response is expected to control
                                   the inbound call.
  -a, --alias=<value>              A human readable description of the application, with maximum length 64 characters.
  -c, --callConnectUrl=<value>     The URL that FreeClimb will request when an outbound call request is complete. Used
                                   for outbound calls only. Note: A PerCL response is expected if the outbound call is
                                   connected (status=InProgress) to control the call.
  -h, --help                       Show CLI help.
  -s, --statusCallbackUrl=<value>  The URL that FreeClimb will request to pass call status (such as call ended) to the
                                   application. Note: This is a notification only; any PerCL returned will be ignored.
  -u, --smsUrl=<value>             The URL that FreeClimb will request when a phone number assigned to this application
                                   receives an incoming SMS message. Used for inbound SMS only. Note: Any PerCL returned
                                   will be ignored.
  -v, --voiceUrl=<value>           The URL that FreeClimb will request when an inbound call arrives on a phone number
                                   assigned to this application. Used only for inbound calls.
      --dry-run                    Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>             Comma-separated list of fields to include in the response. Limits output to protect
                                   context windows when used by agents.
      --json                       Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json
                                   is set.
      --quiet                      Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Update the properties of the specified application.

EXAMPLES
  $ freeclimb applications:update AP1234567890abcdef1234567890abcdef12345678 --alias "Updated App"

  $ freeclimb applications:update AP1234567890abcdef1234567890abcdef12345678 --voiceUrl https://example.com/new-voice --dry-run
```

_See code: [src/commands/applications/update.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/applications/update.ts)_
