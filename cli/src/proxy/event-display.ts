import chalk from "chalk"
import { BrandColors, supportsColor } from "../ui/theme.js"
import type { ForwardResult, ForwardError } from "./forwarder.js"

export interface WebhookEvent {
    body: Record<string, unknown>
    callId?: string
    from?: string
    messageId?: string
    method: string
    path: string
    requestType?: string
    timestamp: Date
    to?: string
}

function timestamp(d: Date): string {
    return d.toLocaleTimeString("en-US", { hour12: false })
}

function extractPerclCommands(body: unknown): string | null {
    if (!Array.isArray(body)) return null
    const names = body.map((cmd: Record<string, unknown>) => Object.keys(cmd)[0]).filter(Boolean)
    return names.length > 0 ? `[${names.join(", ")}]` : null
}

function extractEventInfo(event: WebhookEvent): string {
    const parts: string[] = []

    const reqType = event.requestType || event.body?.requestType
    if (reqType) parts.push(String(reqType))

    const from = event.from || event.body?.from
    if (from) parts.push(`from ${from}`)

    const callId = event.callId || event.body?.callId
    if (callId) parts.push(String(callId))

    const status = event.body?.callStatus || event.body?.status
    if (status) parts.push(String(status))

    return parts.join("  ")
}

export function formatIncoming(event: WebhookEvent): string {
    const ts = chalk.dim(timestamp(event.timestamp))
    const arrow = supportsColor() ? chalk.hex(BrandColors.lightTeal)("→") : "→"
    const method = chalk.bold(event.method)
    const { path } = event
    const info = extractEventInfo(event)

    return `${ts} ${arrow} ${method} ${path}  ${chalk.cyan(info)}`
}

export function formatResponse(event: WebhookEvent, result: ForwardResult): string {
    const ts = chalk.dim(timestamp(event.timestamp))
    const statusColor =
        result.statusCode < 300 ? chalk.green : result.statusCode < 500 ? chalk.yellow : chalk.red
    const status = statusColor(`${result.statusCode}`)
    const latency = chalk.dim(`(${result.latencyMs}ms)`)
    const percl = extractPerclCommands(result.body)
    const perclStr = percl ? chalk.dim(`  PerCL: ${percl}`) : ""

    return `${ts} ${chalk.dim("←")} ${status} ${latency}${perclStr}`
}

export function formatError(event: WebhookEvent, error: ForwardError, targetPort: number): string {
    const ts = chalk.dim(timestamp(event.timestamp))

    if (error.code === "ECONNREFUSED") {
        return `${ts} ${chalk.red("✗")} ${chalk.yellow("ECONNREFUSED")} — is your app running on port ${targetPort}?`
    }

    return `${ts} ${chalk.red("✗")} ${chalk.red(error.code)}: ${error.error}`
}

export function formatJsonEvent(
    event: WebhookEvent,
    response: ForwardResult | ForwardError | null,
): string {
    return JSON.stringify({
        timestamp: event.timestamp.toISOString(),
        direction: "incoming",
        method: event.method,
        path: event.path,
        requestType: event.requestType || event.body?.requestType,
        body: event.body,
        response: response,
    })
}
