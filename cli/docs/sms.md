`freeclimb sms`
===============

A Message instance resource represents an SMS Message sent between FreeClimb and a remote endpoint.

* [`freeclimb sms:get MESSAGEID`](#freeclimb-smsget-messageid)
* [`freeclimb sms:list`](#freeclimb-smslist)
* [`freeclimb sms:send FROM TO TEXT`](#freeclimb-smssend-from-to-text)

## `freeclimb sms:get MESSAGEID`

Retrieve a representation of the specified Message.

```
USAGE
  $ freeclimb sms:get MESSAGEID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  MESSAGEID  String that uniquely identifies this Message resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a representation of the specified Message.

EXAMPLES
  $ freeclimb sms:get SM1234567890abcdef

  $ freeclimb sms:get SM1234567890abcdef --json
```

_See code: [src/commands/sms/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/sms/get.ts)_

## `freeclimb sms:list`

Retrieve a list of SMS Messages made to and from the specified Account, sorted from latest created to oldest.

```
USAGE
  $ freeclimb sms:list [-T <value>] [-f <value>] [-b <value>] [-e <value>] [-d <value>] [-n] [--json]
    [--quiet] [--fields <value>] [-h]

FLAGS
  -T, --to=<value>         Only show Messages to this phone number.
  -b, --beginTime=<value>  Only show Messages sent at or after this time (GMT), given as YYYY-MM-DD hh:mm:ss.
  -d, --direction=<value>  Either inbound or outbound. Only show Messages that were either sent from or received by
                           FreeClimb.
  -e, --endTime=<value>    Only show messages sent at or before this time (GMT), given as YYYY-MM-DD hh:mm.
  -f, --from=<value>       Only show Messages from this phone number.
  -h, --help               Show CLI help.
  -n, --next               Displays the next page of output.
      --fields=<value>     Comma-separated list of fields to include in the response. Limits output to protect context
                           windows when used by agents.
      --json               Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet              Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a list of SMS Messages made to and from the specified Account, sorted from latest created to oldest.

EXAMPLES
  $ freeclimb sms:list

  $ freeclimb sms:list --json

  $ freeclimb sms:list --quiet

  $ freeclimb sms:list --fields messageId,from,to,status
```

_See code: [src/commands/sms/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/sms/list.ts)_

## `freeclimb sms:send FROM TO TEXT`

This command allows you to send a sms message.

```
USAGE
  $ freeclimb sms:send FROM TO TEXT [-n <value>] [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  FROM  Phone number to use as the sender. This must be an incoming phone number that you have purchased from FreeClimb.
  TO    Phone number to receive the message. Must be within FreeClimb's service area. For trial accounts, must be a
        Verified Number.
  TEXT  Text contained in the message.

FLAGS
  -h, --help                     Show CLI help.
  -n, --notificationUrl=<value>  When the Message changes status, this URL is invoked using HTTP POST with the
                                 messageStatus parameters. Note: This is a notification only; any PerCL returned is
                                 ignored.
      --dry-run                  Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>           Comma-separated list of fields to include in the response. Limits output to protect
                                 context windows when used by agents.
      --json                     Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json
                                 is set.
      --quiet                    Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  This command allows you to send a sms message.

EXAMPLES
  $ freeclimb sms:send +12223334444 +15556667777 "Hello from FreeClimb!"

  $ freeclimb sms:send +12223334444 +15556667777 "Hello!" --json

  $ freeclimb sms:send +12223334444 +15556667777 "Test" --dry-run
```

_See code: [src/commands/sms/send.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/sms/send.ts)_
