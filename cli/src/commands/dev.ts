import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { confirm } from "@inquirer/prompts"
import { createTunnel, type Tunnel, type TunnelProvider } from "../tunnel/index.js"
import { WebhookProxyServer } from "../proxy/server.js"
import { isForwardError, type ForwardResponse } from "../proxy/forwarder.js"
import {
    formatIncoming,
    formatResponse,
    formatError,
    formatJsonEvent,
    type WebhookEvent,
} from "../proxy/event-display.js"
import { createSpinner } from "../ui/spinner.js"
import { borderedBox } from "../ui/components.js"
import { BrandColors, supportsColor, isTTY } from "../ui/theme.js"
import { createTempApp, updateAppUrls, getAppUrls, deleteTempApp } from "../dev/app-manager.js"
import { assignNumber, getNumber } from "../dev/number-manager.js"
import { validateResourceId } from "../validation.js"
import {
    readDevState,
    writeDevState,
    isProcessRunning,
    type DevState,
    type NumberAssignment,
    type PreviousAppUrls,
} from "../dev/state.js"
import { performCleanup, registerCleanupHandlers } from "../dev/cleanup.js"

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

    private proxy: WebhookProxyServer | null = null
    private tunnel: Tunnel | null = null
    private devState: DevState | null = null

    async run() {
        const { flags } = await this.parse(Dev)
        const jsonMode = flags.json || !isTTY()
        const { dataDir } = this.config

        // Validate inputs
        if (flags.number) validateResourceId(flags.number, "number")
        if (flags["app-id"]) validateResourceId(flags["app-id"], "app-id")

        // Check for stale state
        await this.handleStaleState(dataDir, jsonMode)

        // Register cleanup handlers early — before any destructive API work
        registerCleanupHandlers(
            () => this.devState,
            dataDir,
            this,
            jsonMode,
            async () => {
                await this.tunnel?.stop().catch(() => {})
                await this.proxy?.stop().catch(() => {})
                // eslint-disable-next-line unicorn/no-process-exit
                process.exit(0)
            },
        )

        // Step 1: Start proxy server (before tunnel so tunnel can point to it)
        const proxySpinner = jsonMode ? null : createSpinner({ text: "Starting proxy server..." })
        proxySpinner?.start()

        this.proxy = new WebhookProxyServer({
            proxyPort: 4000,
            targetPort: flags.port,
        })

        let proxyPort: number
        try {
            proxyPort = await this.proxy.start()
            proxySpinner?.succeed(`Proxy server listening on port ${proxyPort}`)
        } catch (error: unknown) {
            const typedError = error as Error
            proxySpinner?.fail(`Failed to start proxy: ${typedError.message}`)
            this.error(typedError.message, { exit: 1 })
        }

        // Step 2: Start tunnel pointing to proxy
        const tunnelSpinner = jsonMode ? null : createSpinner({ text: "Establishing tunnel..." })
        tunnelSpinner?.start()

        let tunnelUrl: string
        try {
            this.tunnel = createTunnel(flags.tunnel as TunnelProvider)
            tunnelUrl = await this.tunnel.start(proxyPort)
            tunnelSpinner?.succeed(`Tunnel established: ${chalk.bold(tunnelUrl)}`)
        } catch (error: unknown) {
            const typedError = error as Error
            tunnelSpinner?.fail(`Failed to establish tunnel: ${typedError.message}`)
            await this.proxy?.stop().catch(() => {})
            this.error(typedError.message, { exit: 1 })
        }

        // Subscribe to tunnel death
        this.tunnel!.on("error", (err: Error) => {
            if (jsonMode) {
                this.log(JSON.stringify({ event: "tunnel_error", error: err.message }))
            } else {
                this.log(chalk.red(`\nTunnel error: ${err.message}`))
            }
        })
        this.tunnel!.on("close", () => {
            if (jsonMode) {
                this.log(JSON.stringify({ event: "tunnel_closed" }))
            } else {
                this.log(chalk.red("\nTunnel closed unexpectedly. Webhook URLs are now dead."))
                this.log(chalk.dim("Press Ctrl+C to clean up, or restart the command."))
            }
        })

        // Step 3: Create or update application with tunnel URL
        const appSpinner = jsonMode ? null : createSpinner({ text: "Setting up application..." })
        appSpinner?.start()

        let applicationId: string
        let isTemporary: boolean
        let previousAppUrls: PreviousAppUrls | null = null

        try {
            if (flags["app-id"]) {
                applicationId = flags["app-id"]
                isTemporary = false
                // Save existing URLs before overwriting so we can restore on cleanup
                previousAppUrls = await getAppUrls(applicationId)
                await updateAppUrls(applicationId, tunnelUrl)
                appSpinner?.succeed(`Updated application: ${chalk.bold(applicationId)}`)
            } else {
                const app = await createTempApp(tunnelUrl)
                ;({ applicationId } = app)
                isTemporary = true
                appSpinner?.succeed(
                    `Created application: ${chalk.bold(applicationId)} (${chalk.dim(app.alias)})`,
                )
            }
        } catch (error: unknown) {
            const typedError = error as Error
            appSpinner?.fail(`Failed to set up application: ${typedError.message}`)
            await this.tunnel?.stop().catch(() => {})
            await this.proxy?.stop().catch(() => {})
            this.error(typedError.message, { exit: 1 })
        }

        // Write state immediately after app creation so cleanup can find it
        this.devState = {
            pid: process.pid,
            tunnelUrl,
            applicationId,
            isTemporary,
            previousAppUrls,
            numberAssignments: [],
            createdAt: new Date().toISOString(),
        }
        writeDevState(dataDir, this.devState)

        // Step 4: Assign phone number if requested
        let assignedPhoneNumber: string | undefined

        if (flags.number) {
            const numSpinner = jsonMode
                ? null
                : createSpinner({ text: "Assigning phone number..." })
            numSpinner?.start()

            try {
                const numberInfo = await getNumber(flags.number)
                assignedPhoneNumber = numberInfo.phoneNumber
                const previousAppId = await assignNumber(flags.number, applicationId)

                this.devState.numberAssignments.push({
                    phoneNumberId: flags.number,
                    previousApplicationId: previousAppId,
                })
                // Update state file with number assignment for crash recovery
                writeDevState(dataDir, this.devState)

                const prevLabel = previousAppId
                    ? chalk.dim(`(was: ${previousAppId})`)
                    : chalk.dim("(was: unassigned)")
                numSpinner?.succeed(
                    `Assigned ${chalk.bold(assignedPhoneNumber)} → ${applicationId} ${prevLabel}`,
                )
            } catch (error: unknown) {
                const typedError = error as Error
                numSpinner?.fail(`Failed to assign number: ${typedError.message}`)
                // Cleanup will handle restoration via state file
                if (isTemporary) await deleteTempApp(applicationId).catch(() => {})
                await this.tunnel?.stop().catch(() => {})
                await this.proxy?.stop().catch(() => {})
                this.error(typedError.message, { exit: 1 })
            }
        }

        // Step 5: Display summary
        if (jsonMode) {
            this.log(
                JSON.stringify({
                    event: "ready",
                    tunnelUrl,
                    applicationId,
                    isTemporary,
                    phoneNumber: assignedPhoneNumber || null,
                    targetPort: flags.port,
                }),
            )
        } else {
            const summaryLines = [
                ` Tunnel:  ${supportsColor() ? chalk.hex(BrandColors.lightTeal).bold(tunnelUrl) : tunnelUrl}`,
                ` App:     ${chalk.bold(applicationId)}${isTemporary ? chalk.dim(" (temporary)") : ""}`,
            ]
            if (assignedPhoneNumber) {
                summaryLines.push(` Number:  ${chalk.bold(assignedPhoneNumber)}`)
            }
            summaryLines.push(` Target:  http://localhost:${flags.port}`)
            summaryLines.push("")
            if (assignedPhoneNumber) {
                summaryLines.push(` Call ${chalk.bold(assignedPhoneNumber)} to test your app`)
            }
            summaryLines.push(` Press ${chalk.bold("Ctrl+C")} to stop and clean up`)

            this.log("")
            this.log(borderedBox(summaryLines, "Dev environment ready!"))
            this.log("")
            this.log(chalk.dim("Waiting for events...\n"))
        }

        // Wire up event display
        this.proxy!.on("webhook", (event: WebhookEvent, response: ForwardResponse) => {
            if (jsonMode) {
                this.log(formatJsonEvent(event, response))
            } else {
                this.log(formatIncoming(event))
                if (isForwardError(response)) {
                    this.log(formatError(event, response, flags.port))
                } else {
                    this.log(formatResponse(event, response))
                }
            }
        })

        this.proxy!.on("error", (err: Error) => {
            if (jsonMode) {
                this.log(JSON.stringify({ event: "error", error: err.message }))
            } else {
                this.log(chalk.red(`Proxy error: ${err.message}`))
            }
        })

        // Keep alive
        await new Promise<void>(() => {})
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

        // If cleanup partially failed, the state file is retained — abort to prevent overwriting it
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
