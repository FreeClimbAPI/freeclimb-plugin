import { EventEmitter } from "events"
import { spawn, ChildProcess } from "child_process"

export class CloudflaredTunnel extends EventEmitter {
    private process: ChildProcess | null = null
    private tunnelUrl = ""

    get url(): string {
        return this.tunnelUrl
    }

    async start(port: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.stop()
                reject(new Error("Timed out waiting for cloudflared tunnel URL (30s)"))
            }, 30_000)

            try {
                this.process = spawn(
                    "cloudflared",
                    ["tunnel", "--url", `http://localhost:${port}`],
                    {
                        stdio: ["ignore", "pipe", "pipe"],
                    },
                )
            } catch {
                clearTimeout(timeout)
                reject(
                    new Error(
                        "Could not start cloudflared. Is it installed? https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
                    ),
                )
                return
            }

            this.process.on("error", (err: Error) => {
                clearTimeout(timeout)
                reject(
                    new Error(
                        `Could not start cloudflared: ${err.message}. Is it installed? https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`,
                    ),
                )
            })

            this.process.on("close", (code) => {
                clearTimeout(timeout)
                this.emit("close")
                if (!this.tunnelUrl) {
                    reject(new Error(`cloudflared exited with code ${code} before providing a URL`))
                }
            })

            // cloudflared prints the tunnel URL to stderr
            const urlRegex = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
            let stderrBuffer = ""

            this.process.stderr?.on("data", (chunk: Buffer) => {
                stderrBuffer += chunk.toString()
                const match = urlRegex.exec(stderrBuffer)
                if (match) {
                    clearTimeout(timeout)
                    this.tunnelUrl = match[0]
                    resolve(this.tunnelUrl)
                }
            })
        })
    }

    async stop(): Promise<void> {
        if (this.process) {
            this.process.kill("SIGTERM")
            // Give it a moment to clean up, then force kill
            await new Promise<void>((resolve) => {
                const forceKillTimeout = setTimeout(() => {
                    this.process?.kill("SIGKILL")
                    resolve()
                }, 3000)
                this.process?.on("close", () => {
                    clearTimeout(forceKillTimeout)
                    resolve()
                })
            })
            this.process = null
        }
    }
}
