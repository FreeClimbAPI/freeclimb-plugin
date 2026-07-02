`freeclimb mcp`
===============

Output MCP configuration for AI assistants like Claude Desktop.

This command generates the configuration needed to add FreeClimb
to your AI assistant. Copy the output and add it to your
claude_desktop_config.json file.

Configuration file locations:
  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\Claude\claude_desktop_config.json
  Linux: ~/.config/Claude/claude_desktop_config.json

After adding the configuration, restart Claude Desktop to enable
the FreeClimb integration.

Authentication:
  Run node mcp/lib/bin.js login from the plugin directory to store credentials
  in the OS keyring. Do not put FreeClimb credentials in MCP config files.

* [`freeclimb mcp:config`](#freeclimb-mcpconfig)
* [`freeclimb mcp:start`](#freeclimb-mcpstart)

## `freeclimb mcp:config`

Output MCP configuration for AI assistants like Claude Desktop.

```
USAGE
  $ freeclimb mcp:config [-h] [--raw]

FLAGS
  -h, --help  Show CLI help.
      --raw   Output raw JSON without formatting or instructions

DESCRIPTION
  Output MCP configuration for AI assistants like Claude Desktop.

  This command generates the configuration needed to add FreeClimb
  to your AI assistant. Copy the output and add it to your
  claude_desktop_config.json file.

  Configuration file locations:
  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\Claude\claude_desktop_config.json
  Linux: ~/.config/Claude/claude_desktop_config.json

  After adding the configuration, restart Claude Desktop to enable
  the FreeClimb integration.

  Authentication:
  Run node mcp/lib/bin.js login from the plugin directory to store credentials
  in the OS keyring. Do not put FreeClimb credentials in MCP config files.
```

_See code: [src/commands/mcp/config.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/mcp/config.ts)_

## `freeclimb mcp:start`

Start the FreeClimb MCP server for AI agent integration.

```
USAGE
  $ freeclimb mcp:start [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Start the FreeClimb MCP server for AI agent integration.

  The MCP (Model Context Protocol) server allows AI assistants like Claude
  to interact with FreeClimb directly. The server runs in stdio mode and
  communicates via JSON-RPC.

  The MCP surface is read-only. Billable or account-changing actions (placing
  calls, sending SMS, buying numbers, updating calls/applications) are performed
  through the FreeClimb CLI, not via MCP tools.

  Read-only tools exposed to AI agents:
  - list_calls, get_call, list_sms, get_sms: View call/SMS history
  - list_numbers, get_number, search_available_numbers: Inspect phone numbers
  - list_applications, get_application: View applications
  - get_account, list_logs, filter_logs: View account info and logs
  - generate_percl, validate_percl: Build and check PerCL locally
  - And more...

  To configure Claude Desktop to use this server:
  1. Run: freeclimb mcp config
  2. Copy the output to your claude_desktop_config.json
  3. Restart Claude Desktop
```

_See code: [src/commands/mcp/start.ts](https://github.com/FreeClimbAPI/freeclimb-plugin/blob/v0.6.0/src/commands/mcp/start.ts)_
