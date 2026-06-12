import { EventEmitter } from "events"
import ngrok from "@ngrok/ngrok"

export class NgrokTunnel extends EventEmitter {
    private listener: ngrok.Listener | null = null
    private tunnelUrl = ""

    get url(): string {
        return this.tunnelUrl
    }

    async start(port: number): Promise<string> {
        this.listener = await ngrok.forward({
            addr: port,
            // eslint-disable-next-line camelcase
            authtoken_from_env: true,
            onStatusChange: (status: string) => {
                if (status === "closed") {
                    this.emit("close")
                }
            },
        })

        this.tunnelUrl = this.listener.url() || ""

        if (!this.tunnelUrl) {
            throw new Error("ngrok did not return a tunnel URL")
        }

        return this.tunnelUrl
    }

    async stop(): Promise<void> {
        if (this.listener) {
            await this.listener.close()
            this.listener = null
        }
    }
}
