import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { confirm } from "@inquirer/prompts"
import type { TunnelProvider } from "../tunnel/index.js"
import { isTTY } from "../ui/theme.js"
import { validateResourceId } from "../validation.js"
import {
    readDevState,
    isProcessRunning,
} from "../dev/state.js"
import { performCleanup } from "../dev/cleanup.js"
import { WebhookDevSession } from "../dev/session.js"

export class Dev extends Command {
    static description = `Start a full local development environment for FreeClimb.

Creates a public tunnel, a temporary FreeClimb application with webhook
URLs pointing at the tunnel, and optionally assigns a phone number.
All resources are cleaned up automatically when you stop the command.

This is the fastest way to go from zero to handling live calls/SMS locally.
`

    static examples = [
        "freeclimb dev",
        "freeclimb dev --port 8080",
        "freeclimb dev --number PN_abc123",
        "freeclimb dev --app-id AP_abc123",
        "freeclimb dev --tunnel cloudflared",
    ]

    static flags = {
        port: Flags.integer({
            char: "p",
            description: "Port of your local application",
            default: 3000,
        }),
        tunnel: Flags.string({
            char: "t",
            description: "Tunnel provider (ngrok or cloudflared)",
            default: "ngrok",
            options: ["ngrok", "cloudflared"],
        }),
        number: Flags.string({
            char: "n",
            description: "Phone number ID (PN_xxx) to assign to the dev application",
        }),
        "app-id": Flags.string({
            description: "Use an existing application instead of creating a temporary one",
        }),
        json: Flags.boolean({
            description: "Output events as NDJSON (for scripting/agents)",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    async run() {
        const { flags } = await this.parse(Dev)
        const jsonMode = flags.json || !isTTY()
        const { dataDir } = this.config

        if (flags.number) validateResourceId(flags.number, "number")
        if (flags["app-id"]) validateResourceId(flags["app-id"], "app-id")

        await this.handleStaleState(dataDir, jsonMode)

        const session = new WebhookDevSession({
            mode: "dev",
            targetPort: flags.port,
            tunnelProvider: flags.tunnel as TunnelProvider,
            jsonMode,
            logger: this,
            dataDir,
            application: {
                existingAppId: flags["app-id"],
                numberId: flags.number,
            },
            summaryTitle: "Dev environment ready!",
            tunnelCloseHint: "Press Ctrl+C to clean up, or restart the command.",
        })

        await session.run()
    }

    private async handleStaleState(dataDir: string, jsonMode: boolean): Promise<void> {
        const staleState = readDevState(dataDir)
        if (!staleState) return

        if (isProcessRunning(staleState.pid)) {
            this.error(
                `Another dev session is already running (PID ${staleState.pid}). Stop it first or delete ${dataDir}/dev-state.json`,
                { exit: 1 },
            )
        }

        if (jsonMode) {
            await performCleanup(staleState, dataDir, this, jsonMode)
        } else {
            this.log(chalk.yellow(`Found stale dev session from ${staleState.createdAt}`))
            this.log(chalk.yellow(`  Application: ${staleState.applicationId}`))

            const shouldClean = await confirm({
                message: "Clean up orphaned resources?",
                default: true,
            })

            if (shouldClean) {
                await performCleanup(staleState, dataDir, this, jsonMode)
            }
        }

        if (readDevState(dataDir) !== null) {
            this.error(
                "Previous session cleanup incomplete — some resources could not be restored. " +
                    "Fix the issue and run 'freeclimb dev' again to retry, or manually delete " +
                    `${dataDir}/dev-state.json to proceed.`,
                { exit: 1 },
            )
        }
    }
}
