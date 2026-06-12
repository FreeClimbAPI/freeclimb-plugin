`freeclimb login`
=================

Log in to FreeClimb with your credentials. Alternatively you can set the ACCOUNT_ID and API_KEY environment variables. To learn how to put them in a file, run freeclimb data -h

* [`freeclimb login`](#freeclimb-login)

## `freeclimb login`

Log in to FreeClimb with your credentials. Alternatively you can set the ACCOUNT_ID and API_KEY environment variables. To learn how to put them in a file, run freeclimb data -h

```
USAGE
  $ freeclimb login [-h] [--accountId <value>] [--apiKey <value>] [-y]

FLAGS
  -h, --help               Show CLI help.
  -y, --yes                Skip confirmation prompt (required for non-interactive login)
      --accountId=<value>  FreeClimb Account ID (non-interactive login)
      --apiKey=<value>     FreeClimb API Key (non-interactive login)

DESCRIPTION
  Log in to FreeClimb with your credentials. Alternatively you can set the ACCOUNT_ID and API_KEY environment variables.
  To learn how to put them in a file, run freeclimb data -h

EXAMPLES
  $ freeclimb login

  $ freeclimb login --accountId AC1234567890abcdef --apiKey abc123def456 --yes
```

_See code: [src/commands/login.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/login.ts)_
