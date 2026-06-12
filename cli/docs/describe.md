`freeclimb describe`
====================

Describe available commands, flags, and arguments as machine-readable JSON.

Use this command for runtime schema introspection. AI agents can call this
to discover what the CLI accepts without parsing --help output.

Examples:
  freeclimb describe                   # List all topics
  freeclimb describe calls             # Show commands in the calls topic
  freeclimb describe calls:list        # Full schema for calls:list
  freeclimb describe --all             # Full schema for every command

* [`freeclimb describe [COMMAND_OR_TOPIC]`](#freeclimb-describe-command_or_topic)

## `freeclimb describe [COMMAND_OR_TOPIC]`

Describe available commands, flags, and arguments as machine-readable JSON.

```
USAGE
  $ freeclimb describe [COMMAND_OR_TOPIC] [--all] [-h]

ARGUMENTS
  [COMMAND_OR_TOPIC]  Command (e.g. calls:list) or topic (e.g. calls) to describe

FLAGS
  -h, --help  Show CLI help.
      --all   Show full schema for all commands

DESCRIPTION
  Describe available commands, flags, and arguments as machine-readable JSON.

  Use this command for runtime schema introspection. AI agents can call this
  to discover what the CLI accepts without parsing --help output.

  Examples:
  freeclimb describe                   # List all topics
  freeclimb describe calls             # Show commands in the calls topic
  freeclimb describe calls:list        # Full schema for calls:list
  freeclimb describe --all             # Full schema for every command
```

_See code: [src/commands/describe.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/describe.ts)_
