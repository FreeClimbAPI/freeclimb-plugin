#!/usr/bin/env node
import { startMcpServer } from "./server.js"
import { runLoginFlow } from "./auth.js"

async function main(): Promise<void> {
    const command = process.argv[2]

    if (command === "login" || command === "auth") {
        await runLoginFlow()
        console.error("FreeClimb connected. You can close the browser tab.")
        return
    }

    if (command === "--help" || command === "-h" || command === "help") {
        console.error(
            [
                "FreeClimb MCP server",
                "",
                "Usage:",
                "  freeclimb-mcp           Start the MCP server over stdio (default)",
                "  freeclimb-mcp login     Connect your FreeClimb account via the local browser flow",
                "",
                "Credentials are stored in the OS keyring (service 'FreeClimb'), shared with the CLI.",
            ].join("\n"),
        )
        return
    }

    // Default: run the stdio MCP server. Keep stdout clean for JSON-RPC.
    await startMcpServer()
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`freeclimb-mcp failed: ${message}`)
    process.exit(1)
})
