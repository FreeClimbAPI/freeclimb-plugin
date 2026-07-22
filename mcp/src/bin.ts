#!/usr/bin/env node
import { startMcpServer } from "./server.js"
import { runLoginFlow, runLogout } from "./auth.js"

async function main(): Promise<void> {
    const command = process.argv[2]

    if (command === "login" || command === "auth") {
        await runLoginFlow()
        console.error("FreeClimb connected. You can close the browser tab.")
        return
    }

    if (command === "logout") {
        const environmentVariables = await runLogout()
        console.error("FreeClimb credentials removed from the OS keyring.")
        if (environmentVariables.length > 0) {
            console.error(
                `Credential environment variables remain active: ${environmentVariables.join(", ")}. Remove them separately to fully disconnect.`,
            )
        }
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
                "  freeclimb-mcp logout    Disconnect the saved FreeClimb account",
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
