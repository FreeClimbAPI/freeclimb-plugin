import { EventEmitter } from "events"

export interface Tunnel extends EventEmitter {
    start(port: number): Promise<string>
    stop(): Promise<void>
    url: string
}

export type TunnelProvider = "ngrok" | "cloudflared"

export function createTunnel(provider: TunnelProvider): Tunnel {
    switch (provider) {
        case "ngrok":
            return new NgrokAdapter()
        case "cloudflared":
            return new CloudflaredAdapter()
        default:
            throw new Error(`Unknown tunnel provider: ${provider}`)
    }
}

class NgrokAdapter extends EventEmitter implements Tunnel {
    private tunnelUrl = ""
    private adapter: any = null

    get url(): string {
        return this.tunnelUrl
    }

    async start(port: number): Promise<string> {
        const { NgrokTunnel } = await import("./ngrok.js")
        const t = new NgrokTunnel()
        this.adapter = t

        t.on("error", (err: Error) => this.emit("error", err))
        t.on("close", () => this.emit("close"))

        this.tunnelUrl = await t.start(port)
        return this.tunnelUrl
    }

    async stop(): Promise<void> {
        if (this.adapter) {
            await this.adapter.stop()
            this.adapter = null
        }
    }
}

class CloudflaredAdapter extends EventEmitter implements Tunnel {
    private tunnelUrl = ""
    private adapter: any = null

    get url(): string {
        return this.tunnelUrl
    }

    async start(port: number): Promise<string> {
        const { CloudflaredTunnel } = await import("./cloudflared.js")
        const cf = new CloudflaredTunnel()
        this.adapter = cf

        cf.on("error", (err: Error) => this.emit("error", err))
        cf.on("close", () => this.emit("close"))

        this.tunnelUrl = await cf.start(port)
        return this.tunnelUrl
    }

    async stop(): Promise<void> {
        if (this.adapter) {
            await this.adapter.stop()
            this.adapter = null
        }
    }
}
