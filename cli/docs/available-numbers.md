`freeclimb available-numbers`
=============================

Available Numbers are FreeClimb phone numbers available for purchase. The properties of the Available Phone Numbers resource provides a means to search for phone numbers that are available to buy.

* [`freeclimb available-numbers:list`](#freeclimb-available-numberslist)

## `freeclimb available-numbers:list`

Search for phone numbers that are available for purchase. To purchase an available phone number, the number should be submitted via POST to the /IncomingPhoneNumbers endpoint.

```
USAGE
  $ freeclimb available-numbers:list [-a <value>] [-C <value>] [-r <value>] [-E true|false] [-o true|false] [-p <value>]
    [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -C, --country=<value>        Filters numbers by two character ISO country code.
  -E, --smsEnabled=<option>    Filters numbers based on SMS capability.
                               <options: true|false>
  -a, --alias=<value>          Filter on numbers based on the formatted string of the phone number.
  -h, --help                   Show CLI help.
  -n, --next                   Displays the next page of output.
  -o, --voiceEnabled=<option>  Filters numbers based on voice capability.
                               <options: true|false>
  -p, --phoneNumber=<value>    PCRE-compatible regular expression to filter against phoneNumber field, which is in E.164
                               format.
  -r, --region=<value>         Filters numbers by two letter state abbreviation. This flag is only available for US
                               numbers.
      --fields=<value>         Comma-separated list of fields to include in the response. Limits output to protect
                               context windows when used by agents.
      --json                   Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is
                               set.
      --quiet                  Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Search for phone numbers that are available for purchase. To purchase an available phone number, the number should be
  submitted via POST to the /IncomingPhoneNumbers endpoint.

EXAMPLES
  $ freeclimb available-numbers:list

  $ freeclimb available-numbers:list --alias 123-456-7890

  $ freeclimb available-numbers:list --json
```

_See code: [src/commands/available-numbers/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/available-numbers/list.ts)_
