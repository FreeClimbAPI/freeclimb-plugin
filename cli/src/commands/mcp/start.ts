import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { startMcpServer } from "../../mcp/server.js"

export class McpStart extends Command {
    static description = `Start the FreeClimb MCP server for AI agent integration.

The MCP (Model Context Protocol) server allows AI assistants like Claude
to interact with FreeClimb directly. The server runs in stdio mode and
communicates via JSON-RPC.

Available tools exposed to AI agents:
  - make_call: Make outbound phone calls
  - send_sms: Send SMS messages
  - list_calls, list_sms: View call/SMS history
  - list_numbers: View owned phone numbers
  - list_applications: View applications
  - get_account: View account info
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
