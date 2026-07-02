import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { generateMcpConfig } from "@freeclimb/mcp"

export class McpConfig extends Command {
    static description = `Output MCP configuration for AI assistants like Claude Desktop.

This command generates the configuration needed to add FreeClimb
to your AI assistant. Copy the output and add it to your
claude_desktop_config.json file.

Configuration file locations:
  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\\Claude\\claude_desktop_config.json
  Linux: ~/.config/Claude/claude_desktop_config.json

After adding the configuration, restart Claude Desktop to enable
the FreeClimb integration.

Authentication:
  Run node mcp/lib/bin.js login from the plugin directory to store credentials
  in the OS keyring. Do not put FreeClimb credentials in MCP config files.
`

    static flags = {
        help: Flags.help({ char: "h" }),
        raw: Flags.boolean({
            description: "Output raw JSON without formatting or instructions",
            default: false,
        }),
    }

    async run() {
        const { flags } = await this.parse(McpConfig)
        const config = generateMcpConfig()

        if (flags.raw) {
            this.log(config)
            return
        }

        this.log("")
        this.log(chalk.cyan.bold("FreeClimb MCP Configuration"))
        this.log(chalk.dim("Add this to your claude_desktop_config.json:"))
        this.log("")
        this.log(chalk.green(config))
        this.log("")
        this.log(chalk.yellow("Instructions:"))
        this.log(chalk.dim("1. Copy the JSON above"))
        this.log(chalk.dim("2. Add to your claude_desktop_config.json (merge with existing mcpServers)"))
        this.log(chalk.dim("3. Run node mcp/lib/bin.js login from the plugin directory"))
        this.log(chalk.dim("4. Restart Claude Desktop"))
        this.log("")
        this.log(chalk.dim("Config file locations:"))
        this.log(chalk.dim("  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"))
        this.log(chalk.dim("  Windows: %APPDATA%\\Claude\\claude_desktop_config.json"))
        this.log(chalk.dim("  Linux: ~/.config/Claude/claude_desktop_config.json"))
        this.log("")
    }
}
