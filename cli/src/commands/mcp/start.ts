import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { startMcpServer } from "@freeclimb/mcp"

export class McpStart extends Command {
    static description = `Start the FreeClimb MCP server for AI agent integration.

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
`

    static flags = {
        help: Flags.help({ char: "h" }),
    }

    async run() {
        // Suppress console output since MCP uses stdio
        const originalLog = console.log
        const originalError = console.error

        // Only allow errors to stderr before MCP takes over
        console.log = () => {}
        console.error = (msg: string) => {
            if (typeof msg === "string" && msg.includes("MCP")) {
                originalError(chalk.cyan(msg))
            }
        }

        try {
            await startMcpServer()
        } catch (error: any) {
            console.log = originalLog
            console.error = originalError
            this.error(chalk.red(`Failed to start MCP server: ${error.message}`), { exit: 1 })
        }
    }
}
