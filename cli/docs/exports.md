`freeclimb exports`
===================

Exports are bulk data extracts of Calls or Messages that can be downloaded when processing completes.

* [`freeclimb exports:create`](#freeclimb-exportscreate)
* [`freeclimb exports:delete EXPORTID`](#freeclimb-exportsdelete-exportid)
* [`freeclimb exports:download EXPORTID`](#freeclimb-exportsdownload-exportid)
* [`freeclimb exports:get EXPORTID`](#freeclimb-exportsget-exportid)
* [`freeclimb exports:list`](#freeclimb-exportslist)

## `freeclimb exports:list`

Retrieve a list of Exports associated with the specified account, sorted from latest created to oldest.

```
USAGE
  $ freeclimb exports:list [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -h, --help            Show CLI help.
  -n, --next            Displays the next page of output.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Retrieve a list of Exports associated with the specified account, sorted from latest created to oldest.

EXAMPLES
  $ freeclimb exports:list

  $ freeclimb exports:list --json
```

_See code: [src/commands/exports/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/exports/list.ts)_

## `freeclimb exports:get EXPORTID`

Retrieve metadata for a specific Export.

```
USAGE
  $ freeclimb exports:get EXPORTID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  EXPORTID  String that uniquely identifies this Export resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Retrieve metadata for a specific Export.

EXAMPLES
  $ freeclimb exports:get EX1234567890abcdef
```

_See code: [src/commands/exports/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/exports/get.ts)_

## `freeclimb exports:create`

Create a new Export for Calls or Messages within the specified account.

```
USAGE
  $ freeclimb exports:create -r Calls|Messages [-q <value>] [-f <value>] [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

FLAGS
  -f, --format=<value>        Comma-separated list of resource properties to include in the export.
  -h, --help                  Show CLI help.
  -q, --query=<value>         PQL or list query as a JSON object string.
  -r, --resourceType=<option>  (required) The API resource type to export.
                              <options: Calls|Messages>
      --dry-run               Validate the request without executing it.
      --fields=<value>        Comma-separated list of fields to include in the response.
      --json                  Output as JSON.
      --quiet                 Output only resource IDs, one per line.

DESCRIPTION
  Create a new Export for Calls or Messages within the specified account.

EXAMPLES
  $ freeclimb exports:create --resourceType Calls

  $ freeclimb exports:create --resourceType Calls --dry-run
```

_See code: [src/commands/exports/create.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/exports/create.ts)_

## `freeclimb exports:download EXPORTID`

Download an Export file to disk.

```
USAGE
  $ freeclimb exports:download EXPORTID [-o <value>] [--json] [--quiet] [-h]

ARGUMENTS
  EXPORTID  String that uniquely identifies this Export resource.

FLAGS
  -h, --help            Show CLI help.
  -o, --output=<value>  Path to write the downloaded export file.
      --json            Output as JSON.
      --quiet           Output only the output file path.

DESCRIPTION
  Download an Export file to disk.

EXAMPLES
  $ freeclimb exports:download EX1234567890abcdef

  $ freeclimb exports:download EX1234567890abcdef --output my-export.csv
```

_See code: [src/commands/exports/download.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/exports/download.ts)_

## `freeclimb exports:delete EXPORTID`

Delete the specified Export.

```
USAGE
  $ freeclimb exports:delete EXPORTID [--json] [--quiet] [--fields <value>] [--dry-run] [-y] [-h]

ARGUMENTS
  EXPORTID  String that uniquely identifies this Export resource.

FLAGS
  -h, --help            Show CLI help.
  -y, --yes             Skip the confirmation prompt shown in interactive terminals.
      --dry-run         Validate the request without executing it.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Delete the specified Export. Both the export file and the resource metadata are deleted.

EXAMPLES
  $ freeclimb exports:delete EX1234567890abcdef

  $ freeclimb exports:delete EX1234567890abcdef --dry-run
```

_See code: [src/commands/exports/delete.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/exports/delete.ts)_
