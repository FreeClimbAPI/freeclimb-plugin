`freeclimb recordings`
======================

A Recording instance resource represents an audio file created by FreeClimb during a Call or Conference.

* [`freeclimb recordings:delete RECORDINGID`](#freeclimb-recordingsdelete-recordingid)
* [`freeclimb recordings:download RECORDINGID`](#freeclimb-recordingsdownload-recordingid)
* [`freeclimb recordings:get RECORDINGID`](#freeclimb-recordingsget-recordingid)
* [`freeclimb recordings:list`](#freeclimb-recordingslist)
* [`freeclimb recordings:stream RECORDINGID`](#freeclimb-recordingsstream-recordingid)

## `freeclimb recordings:delete RECORDINGID`

Delete the specified recording. Both the audio file and the resource metadata are deleted.

```
USAGE
  $ freeclimb recordings:delete RECORDINGID [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  RECORDINGID  String that uniquely identifies this recording resource.

FLAGS
  -h, --help            Show CLI help.
      --dry-run         Validate the request without executing it. Shows what would be sent to the API.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Delete the specified recording. Both the audio file and the resource metadata are deleted.

EXAMPLES
  $ freeclimb recordings:delete RE1234567890abcdef

  $ freeclimb recordings:delete RE1234567890abcdef --dry-run
```

_See code: [src/commands/recordings/delete.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/recordings/delete.ts)_

## `freeclimb recordings:download RECORDINGID`

Download a Recording. Authentication is required to download a Recording, as with any other request made to the REST API.

```
USAGE
  $ freeclimb recordings:download RECORDINGID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  RECORDINGID  String that uniquely identifies this recording resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Download a Recording. Authentication is required to download a Recording, as with any other request made to the REST
  API.

EXAMPLES
  $ freeclimb recordings:download RE1234567890abcdef

  $ freeclimb recordings:download RE1234567890abcdef --json
```

_See code: [src/commands/recordings/download.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/recordings/download.ts)_

## `freeclimb recordings:get RECORDINGID`

Retrieve metadata for a specific Recording.

```
USAGE
  $ freeclimb recordings:get RECORDINGID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  RECORDINGID  String that uniquely identifies this recording resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve metadata for a specific Recording.

EXAMPLES
  $ freeclimb recordings:get RE1234567890abcdef

  $ freeclimb recordings:get RE1234567890abcdef --json
```

_See code: [src/commands/recordings/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/recordings/get.ts)_

## `freeclimb recordings:list`

Retrieve a list of metadata for recordings associated with the specified account, sorted from latest created to oldest.

```
USAGE
  $ freeclimb recordings:list [-c <value>] [-C <value>] [-d <value>] [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -C, --conferenceId=<value>  Show only Recordings made during the conference with this ID.
  -c, --callId=<value>        Show only Recordings made during the Call with this ID.
  -d, --dateCreated=<value>   Only show Recordings created on this date, formatted as YYYY-MM-DD.
  -h, --help                  Show CLI help.
  -n, --next                  Displays the next page of output.
      --fields=<value>        Comma-separated list of fields to include in the response. Limits output to protect
                              context windows when used by agents.
      --json                  Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is
                              set.
      --quiet                 Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Retrieve a list of metadata for recordings associated with the specified account, sorted from latest created to
  oldest.

EXAMPLES
  $ freeclimb recordings:list

  $ freeclimb recordings:list --json

  $ freeclimb recordings:list --quiet
```

_See code: [src/commands/recordings/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/recordings/list.ts)_

## `freeclimb recordings:stream RECORDINGID`

Stream a Recording File. Authentication is required to stream a Recording, as with any other request made to the REST API.

```
USAGE
  $ freeclimb recordings:stream RECORDINGID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  RECORDINGID  String that uniquely identifies this recording resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response. Limits output to protect context
                        windows when used by agents.
      --json            Output as JSON. Auto-enabled when stdout is not a TTY or FREECLIMB_OUTPUT_FORMAT=json is set.
      --quiet           Output only resource IDs, one per line. Useful for piping into other commands.

DESCRIPTION
  Stream a Recording File. Authentication is required to stream a Recording, as with any other request made to the REST
  API.

EXAMPLES
  $ freeclimb recordings:stream RE1234567890abcdef

  $ freeclimb recordings:stream RE1234567890abcdef --json
```

_See code: [src/commands/recordings/stream.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/recordings/stream.ts)_
