import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
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

export class Listen extends Command {
    static description = `Start a local webhook listener for FreeClimb events.

Starts a public tunnel and local proxy server that forwards incoming
FreeClimb webhooks (voice, SMS, status callbacks) to your local
application. Events are displayed in real-time in the terminal.

Use the printed tunnel URL as your FreeClimb application's voiceUrl,
smsUrl, or statusCallbackUrl.

For a fully automated local dev setup, see: freeclimb dev
`

    static examples = [
        "freeclimb listen",
        "freeclimb listen --port 8080",
        "freeclimb listen --tunnel ngrok",
        "freeclimb listen --tunnel cloudflared",
        "freeclimb listen --json",
    ]

    static flags = {
        port: Flags.integer({
            char: "p",
            description: "Port of your local application",
            default: 3000,
        }),
        "tunnel-port": Flags.integer({
            description: "Port for the local proxy server",
            default: 4000,
        }),
        tunnel: Flags.string({
            char: "t",
            description: "Tunnel provider (ngrok or cloudflared)",
            default: "ngrok",
            options: ["ngrok", "cloudflared"],
        }),
        json: Flags.boolean({
            description: "Output events as NDJSON (for scripting/agents)",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    private proxy: WebhookProxyServer | null = null
    private tunnel: Tunnel | null = null
    private shuttingDown = false

    async run() {
        const { flags } = await this.parse(Listen)
        const jsonMode = flags.json || !isTTY()

        // Register cleanup handlers early
        const shutdownHandler = async () => {
            if (this.shuttingDown) return
            this.shuttingDown = true
            if (!jsonMode) this.log(chalk.dim("\nShutting down..."))
            await this.cleanup()
            // eslint-disable-next-line unicorn/no-process-exit
            process.exit(0)
        }

        process.on("SIGINT", shutdownHandler)
        process.on("SIGTERM", shutdownHandler)

        // Start proxy server
        const proxySpinner = jsonMode ? null : createSpinner({ text: "Starting proxy server..." })
        proxySpinner?.start()

        this.proxy = new WebhookProxyServer({
            proxyPort: flags["tunnel-port"],
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

        // Start tunnel — use the actual bound port, not the flag value
        const tunnelSpinner = jsonMode ? null : createSpinner({ text: "Establishing tunnel..." })
        tunnelSpinner?.start()

        try {
            this.tunnel = createTunnel(flags.tunnel as TunnelProvider)
            await this.tunnel.start(proxyPort)
            tunnelSpinner?.succeed(`Tunnel established: ${chalk.bold(this.tunnel.url)}`)
        } catch (error: unknown) {
            const typedError = error as Error
            tunnelSpinner?.fail(`Failed to establish tunnel: ${typedError.message}`)
            await this.cleanup()
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
                this.log(chalk.dim("Press Ctrl+C to exit, or restart the command."))
            }
        })

        // Display summary
        const tunnelUrl = this.tunnel!.url
        if (jsonMode) {
            this.log(
                JSON.stringify({
                    event: "ready",
                    tunnelUrl,
                    targetPort: flags.port,
                    proxyPort,
                }),
            )
        } else {
            this.log("")
            this.log(
                borderedBox(
                    [
                        ` Forwarding webhooks ${chalk.dim("→")} http://localhost:${flags.port}`,
                        ` Tunnel URL: ${supportsColor() ? chalk.hex(BrandColors.lightTeal).bold(tunnelUrl) : tunnelUrl}`,
                        "",
                        ` Set this as your application's voiceUrl/smsUrl`,
                        ` Press ${chalk.bold("Ctrl+C")} to stop`,
                    ],
                    "FreeClimb Listen",
                ),
            )
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

        // Keep the process alive
        await new Promise<void>(() => {
            // This promise never resolves — we run until SIGINT/SIGTERM
        })
    }

    private async cleanup(): Promise<void> {
        await this.tunnel?.stop().catch(() => {})
        await this.proxy?.stop().catch(() => {})
    }
}
