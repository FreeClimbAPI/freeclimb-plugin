`freeclimb blobs`
=================

Blobs are account-scoped JSON documents for storing application state and configuration data.

* [`freeclimb blobs:create`](#freeclimb-blobscreate)
* [`freeclimb blobs:delete BLOBID`](#freeclimb-blobsdelete-blobid)
* [`freeclimb blobs:get BLOBID`](#freeclimb-blobsget-blobid)
* [`freeclimb blobs:list`](#freeclimb-blobslist)
* [`freeclimb blobs:modify BLOBID`](#freeclimb-blobsmodify-blobid)
* [`freeclimb blobs:replace BLOBID`](#freeclimb-blobsreplace-blobid)

## `freeclimb blobs:list`

Retrieve a list of Blobs associated with the specified account, sorted from latest created to oldest.

```
USAGE
  $ freeclimb blobs:list [-n] [--json] [--quiet] [--fields <value>] [-h]

FLAGS
  -h, --help            Show CLI help.
  -n, --next            Displays the next page of output.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Retrieve a list of Blobs associated with the specified account, sorted from latest created to oldest.

EXAMPLES
  $ freeclimb blobs:list

  $ freeclimb blobs:list --json
```

_See code: [src/commands/blobs/list.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/list.ts)_

## `freeclimb blobs:get BLOBID`

Retrieve metadata and data for a specific Blob.

```
USAGE
  $ freeclimb blobs:get BLOBID [--json] [--quiet] [--fields <value>] [-h]

ARGUMENTS
  BLOBID  String that uniquely identifies this Blob resource.

FLAGS
  -h, --help            Show CLI help.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Retrieve metadata and data for a specific Blob.

EXAMPLES
  $ freeclimb blobs:get BL1234567890abcdef
```

_See code: [src/commands/blobs/get.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/get.ts)_

## `freeclimb blobs:create`

Create a new Blob within the specified account.

```
USAGE
  $ freeclimb blobs:create -d <value> [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

FLAGS
  -d, --data=<value>  (required) Blob payload as a JSON string.
  -h, --help          Show CLI help.
      --dry-run       Validate the request without executing it.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json          Output as JSON.
      --quiet         Output only resource IDs, one per line.

DESCRIPTION
  Create a new Blob within the specified account.

EXAMPLES
  $ freeclimb blobs:create --data '{"alias":"my-state","value":1}'

  $ freeclimb blobs:create --data '{"alias":"my-state"}' --dry-run
```

_See code: [src/commands/blobs/create.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/create.ts)_

## `freeclimb blobs:modify BLOBID`

Partially update a Blob within the specified account.

```
USAGE
  $ freeclimb blobs:modify BLOBID -d <value> [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  BLOBID  String that uniquely identifies this Blob resource.

FLAGS
  -d, --data=<value>  (required) Blob fields to update as a JSON string.
  -h, --help          Show CLI help.
      --dry-run       Validate the request without executing it.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json          Output as JSON.
      --quiet         Output only resource IDs, one per line.

DESCRIPTION
  Partially update a Blob within the specified account.

EXAMPLES
  $ freeclimb blobs:modify BL1234567890abcdef --data '{"value":2}'
```

_See code: [src/commands/blobs/modify.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/modify.ts)_

## `freeclimb blobs:replace BLOBID`

Replace a Blob within the specified account.

```
USAGE
  $ freeclimb blobs:replace BLOBID -d <value> [--json] [--quiet] [--fields <value>] [--dry-run] [-h]

ARGUMENTS
  BLOBID  String that uniquely identifies this Blob resource.

FLAGS
  -d, --data=<value>  (required) Replacement Blob payload as a JSON string.
  -h, --help          Show CLI help.
      --dry-run       Validate the request without executing it.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json          Output as JSON.
      --quiet         Output only resource IDs, one per line.

DESCRIPTION
  Replace a Blob within the specified account.

EXAMPLES
  $ freeclimb blobs:replace BL1234567890abcdef --data '{"alias":"my-state","value":3}'
```

_See code: [src/commands/blobs/replace.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/replace.ts)_

## `freeclimb blobs:delete BLOBID`

Delete the specified Blob.

```
USAGE
  $ freeclimb blobs:delete BLOBID [--json] [--quiet] [--fields <value>] [--dry-run] [-y] [-h]

ARGUMENTS
  BLOBID  String that uniquely identifies this Blob resource.

FLAGS
  -h, --help            Show CLI help.
  -y, --yes             Skip the confirmation prompt shown in interactive terminals.
      --dry-run         Validate the request without executing it.
      --fields=<value>  Comma-separated list of fields to include in the response.
      --json            Output as JSON.
      --quiet           Output only resource IDs, one per line.

DESCRIPTION
  Delete the specified Blob. Both the stored data and the resource metadata are deleted.

EXAMPLES
  $ freeclimb blobs:delete BL1234567890abcdef

  $ freeclimb blobs:delete BL1234567890abcdef --dry-run
```

_See code: [src/commands/blobs/delete.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/blobs/delete.ts)_
