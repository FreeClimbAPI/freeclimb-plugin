import http from "http"
import { EventEmitter } from "events"
import { forwardRequest, isForwardError, type ForwardResponse } from "./forwarder.js"
import type { WebhookEvent } from "./event-display.js"

const MAX_BODY_SIZE = 1024 * 1024 // 1MB — more than enough for any webhook payload

export interface ProxyServerOptions {
    /** Port the proxy listens on (receives webhooks from the tunnel) */
    proxyPort: number
    /** Port of the user's local application */
    targetPort: number
}

export class WebhookProxyServer extends EventEmitter {
    private server: http.Server | null = null
    private readonly targetPort: number
    private readonly proxyPort: number

    constructor(options: ProxyServerOptions) {
        super()
        this.targetPort = options.targetPort
        this.proxyPort = options.proxyPort
    }

    async start(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res)
            })

            this.server.on("error", (err: Error) => {
                this.emit("error", err)
                reject(err)
            })

            this.server.listen(this.proxyPort, () => {
                const addr = this.server?.address()
                const port = typeof addr === "object" && addr ? addr.port : this.proxyPort
                this.emit("listening", port)
                resolve(port)
            })
        })
    }

    async stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.server) {
                this.server.close(() => resolve())
            } else {
                resolve()
            }
        })
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const chunks: Buffer[] = []
        let totalSize = 0
        let aborted = false

        req.on("data", (chunk: Buffer) => {
            totalSize += chunk.length
            if (totalSize > MAX_BODY_SIZE) {
                aborted = true
                req.destroy()
                res.writeHead(413, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: "Request body too large" }))
                return
            }
            chunks.push(chunk)
        })

        req.on("end", async () => {
            if (aborted) return

            const rawBody = Buffer.concat(chunks)

            // Try to parse as JSON for event display, but forward raw body regardless
            let parsedBody: Record<string, unknown> = {}
            try {
                parsedBody = JSON.parse(rawBody.toString("utf-8"))
            } catch {
                // Not JSON — still forward transparently
            }

            const event: WebhookEvent = {
                timestamp: new Date(),
                method: req.method || "POST",
                path: req.url || "/",
                body: parsedBody,
                requestType: parsedBody.requestType as string | undefined,
                from: parsedBody.from as string | undefined,
                to: parsedBody.to as string | undefined,
                callId: parsedBody.callId as string | undefined,
                messageId: parsedBody.messageId as string | undefined,
            }

            // Forward all original headers (except host which should target localhost)
            const headers: Record<string, string> = {}
            for (const [key, value] of Object.entries(req.headers)) {
                if (typeof value === "string" && key !== "host") headers[key] = value
            }

            const result = await forwardRequest(
                this.targetPort,
                event.method,
                event.path,
                headers,
                rawBody,
            )

            this.emit("webhook", event, result)

            if (isForwardError(result)) {
                res.writeHead(502, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: "Target application unavailable" }))
            } else {
                // Forward the target app's response, filtering hop-by-hop headers
                const HOP_BY_HOP = new Set(["transfer-encoding", "connection", "keep-alive", "content-length"])
                const forwardHeaders: Record<string, string> = {}
                if (result.headers) {
                    for (const [key, value] of Object.entries(result.headers)) {
                        if (!HOP_BY_HOP.has(key)) forwardHeaders[key] = value
                    }
                }
                const responseBody =
                    typeof result.body === "string" ? result.body : JSON.stringify(result.body)
                res.writeHead(result.statusCode, forwardHeaders)
                res.end(responseBody)
            }
        })

        req.on("error", (err: Error) => {
            this.emit("error", err)
            res.writeHead(500)
            res.end()
        })
    }
}
