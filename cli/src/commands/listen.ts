import { Command, Flags } from "@oclif/core"
import type { TunnelProvider } from "../tunnel/index.js"
import { isTTY } from "../ui/theme.js"
import { WebhookDevSession } from "../dev/session.js"

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

    async run() {
        const { flags } = await this.parse(Listen)
        const jsonMode = flags.json || !isTTY()

        const session = new WebhookDevSession({
            mode: "listen",
            targetPort: flags.port,
            proxyPort: flags["tunnel-port"],
            tunnelProvider: flags.tunnel as TunnelProvider,
            jsonMode,
            logger: this,
            summaryTitle: "FreeClimb Listen",
            tunnelCloseHint: "Press Ctrl+C to exit, or restart the command.",
        })

        await session.run()
    }
}
