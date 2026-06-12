import chalk from "chalk"
import { BrandColors, supportsColor, isTTY, getTerminalWidth } from "./theme.js"
import { getBoxChars } from "./chars.js"

export interface StructuredOutput<T = unknown> {
    data: T
    error?: {
        code: number
        message: string
        suggestion?: string
    }
    metadata: {
        accountId?: string
        command?: string
        request?: {
            body?: unknown
            endpoint: string
            method: string
        }
        requestId?: string
        timestamp: string
    }
    pagination?: {
        nextCursor?: string | null
        page: number
        total?: number
    }
    success: boolean
}

export function wrapJsonOutput<T>(
    data: T,
    options: {
        accountId?: string
        command?: string
        nextCursor?: string | null
        page?: number
        request?: {
            body?: unknown
            endpoint: string
            method: string
        }
        requestId?: string
        total?: number
    } = {},
): StructuredOutput<T> {
    const output: StructuredOutput<T> = {
        success: true,
        data,
        metadata: {
            timestamp: new Date().toISOString(),
        },
    }

    if (options.accountId) {
        output.metadata.accountId = options.accountId
    }

    if (options.command) {
        output.metadata.command = options.command
    }

    if (options.request) {
        output.metadata.request = options.request
    }

    if (options.requestId) {
        output.metadata.requestId = options.requestId
    }

    if (options.nextCursor !== undefined || options.page !== undefined) {
        output.pagination = {
            page: options.page || 1,
            total: options.total,
            nextCursor: options.nextCursor,
        }
    }

    return output
}

// Status values that should be colored
const STATUS_COLORS: Record<string, "success" | "warning" | "error"> = {
    active: "success",
    completed: "success",
    answered: "success",
    delivered: "success",
    sent: "success",
    queued: "warning",
    pending: "warning",
    ringing: "warning",
    "in-progress": "warning",
    inprogress: "warning",
    failed: "error",
    busy: "error",
    "no-answer": "error",
    noanswer: "error",
    canceled: "error",
    cancelled: "error",
}

// Log level values that should be colored
const LEVEL_COLORS: Record<string, "success" | "warning" | "error" | "info" | "debug"> = {
    error: "error",
    warning: "warning",
    warn: "warning",
    info: "info",
    success: "success",
    debug: "debug",
}

// Columns that get automatic colorization
const COLORIZED_COLUMNS = new Set(["status", "level"])

// Color a cell value based on its column and semantic meaning
function colorCell(colKey: string, value: string): string {
    if (!supportsColor()) return value

    const normalizedCol = colKey.toLowerCase()
    if (!COLORIZED_COLUMNS.has(normalizedCol)) return value

    const normalizedValue = value.toLowerCase().replace(/[_\s]/g, "-")
    const colorType = normalizedCol === "level"
        ? LEVEL_COLORS[normalizedValue]
        : STATUS_COLORS[normalizedValue]

    if (!colorType) return value

    switch (colorType) {
        case "success": {
            return chalk.hex("#3fb950")(value)
        }
        case "warning": {
            return chalk.hex(BrandColors.orange)(value)
        }
        case "error": {
            return chalk.red(value)
        }
        case "info": {
            return chalk.hex("#58a6ff")(value)
        }
        case "debug": {
            return chalk.hex("#8b949e")(value)
        }
        default: {
            return value
        }
    }
}

// Truncate text with ellipsis
function truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text
    if (maxLen <= 1) return "\u2026"
    return text.slice(0, maxLen - 1) + "\u2026"
}

function shrinkColumnsToFit(widths: number[], overhead: number, termWidth: number): number[] {
    const totalRaw = widths.reduce((a, b) => a + b, 0)
    const available = termWidth - overhead

    if (totalRaw > available && available > widths.length) {
        return widths.map((w) => Math.max(6, Math.floor((w / totalRaw) * available)))
    }

    return widths
}

export function formatTable(
    data: Record<string, unknown>[],
    columns: { header: string; key: string; width?: number }[],
): string {
    if (data.length === 0) {
        return chalk.dim("No data available")
    }

    const colWidths = shrinkColumnsToFit(columns.map((col) => {
        const headerLen = col.header.length
        const maxDataLen = Math.max(...data.map((row) => String(row[col.key] || "").length))
        return col.width || Math.max(headerLen, maxDataLen, 10)
    }), columns.length * 2 + 2, getTerminalWidth())

    const headerRow = columns
        .map((col, i) => chalk.bold(col.header.padEnd(colWidths[i])))
        .join("  ")

    const separator = colWidths.map((w) => "-".repeat(w)).join("  ")

    const rows = data.map((row) =>
        columns
            .map((col, i) => {
                const val = String(row[col.key] || "")
                const shouldColorize = COLORIZED_COLUMNS.has(col.key.toLowerCase())
                let displayVal =
                    val.length > colWidths[i]
                        ? truncateText(val, colWidths[i])
                        : val.padEnd(colWidths[i])

                // Color status/level columns
                if (shouldColorize && supportsColor()) {
                    const coloredVal = colorCell(col.key, val)
                    const padding = colWidths[i] - val.length
                    displayVal = coloredVal + (padding > 0 ? " ".repeat(padding) : "")
                }

                return displayVal
            })
            .join("  "),
    )

    return [headerRow, separator, ...rows].join("\n")
}

// Format table with Unicode borders (for TTY environments)
export function formatTableWithBorders(
    data: Record<string, unknown>[],
    columns: { header: string; key: string; width?: number }[],
    title?: string,
): string {
    if (data.length === 0) {
        return chalk.dim("No data available")
    }

    // Use simple format for non-TTY
    if (!isTTY()) {
        return formatTable(data, columns)
    }

    const chars = getBoxChars()

    // Calculate column widths, shrink proportionally if wider than terminal
    const overhead = (columns.length - 1) * 3 + 4
    const colWidths = shrinkColumnsToFit(columns.map((col) => {
        const headerLen = col.header.length
        const maxDataLen = Math.max(...data.map((row) => String(row[col.key] || "").length))
        return col.width || Math.max(headerLen, maxDataLen, 10)
    }), overhead, getTerminalWidth())

    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + overhead
    const lines: string[] = []

    // Top border with optional title
    if (title) {
        const paddedTitle = ` ${title} `
        const remainingWidth = Math.max(0, totalWidth - paddedTitle.length - 2)
        const titleLine = supportsColor()
            ? `${chars.topLeft}${chars.horizontal}${chalk.hex(BrandColors.lightTeal).bold(paddedTitle)}${chars.horizontal.repeat(remainingWidth)}${chars.topRight}`
            : `${chars.topLeft}${chars.horizontal}${paddedTitle}${chars.horizontal.repeat(remainingWidth)}${chars.topRight}`
        lines.push(titleLine)
    } else {
        lines.push(`${chars.topLeft}${chars.horizontal.repeat(totalWidth - 2)}${chars.topRight}`)
    }

    // Header row
    const headerCells = columns.map((col, i) => {
        const header = supportsColor()
            ? chalk.bold(col.header.padEnd(colWidths[i]))
            : col.header.padEnd(colWidths[i])
        return header
    })
    const headerJoinSep = ` ${chars.vertical} `
    lines.push(`${chars.vertical} ${headerCells.join(headerJoinSep)} ${chars.vertical}`)

    // Header separator
    const headerSepParts = colWidths.map((w) => chars.horizontal.repeat(w + 2))
    lines.push(`${chars.teeRight}${headerSepParts.join(chars.cross)}${chars.teeLeft}`)

    // Data rows
    const cellJoinSep = ` ${chars.vertical} `
    for (const row of data) {
        const cells = columns.map((col, i) => {
            const val = String(row[col.key] || "")
            const shouldColorize = COLORIZED_COLUMNS.has(col.key.toLowerCase())
            let cell: string

            if (val.length > colWidths[i]) {
                cell = truncateText(val, colWidths[i])
            } else {
                cell = val.padEnd(colWidths[i])
            }

            // Color status/level columns
            if (shouldColorize && supportsColor()) {
                const coloredVal = colorCell(col.key, val)
                const padding = colWidths[i] - val.length
                cell = coloredVal + (padding > 0 ? " ".repeat(padding) : "")
            }

            return cell
        })
        lines.push(`${chars.vertical} ${cells.join(cellJoinSep)} ${chars.vertical}`)
    }

    // Bottom border
    lines.push(`${chars.bottomLeft}${chars.horizontal.repeat(totalWidth - 2)}${chars.bottomRight}`)

    return lines.join("\n")
}

export function formatCallsList(data: unknown): string {
    const calls = Array.isArray(data) ? data : (data as any)?.calls || []

    if (calls.length === 0) {
        return chalk.dim("No calls found")
    }

    return formatTable(calls, [
        { key: "callId", header: "Call ID", width: 24 },
        { key: "from", header: "From", width: 15 },
        { key: "to", header: "To", width: 15 },
        { key: "status", header: "Status", width: 12 },
        { key: "direction", header: "Direction", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ])
}

export function formatSmsList(data: unknown): string {
    const messages = Array.isArray(data) ? data : (data as any)?.messages || []

    if (messages.length === 0) {
        return chalk.dim("No messages found")
    }

    return formatTable(messages, [
        { key: "messageId", header: "Message ID", width: 24 },
        { key: "from", header: "From", width: 15 },
        { key: "to", header: "To", width: 15 },
        { key: "status", header: "Status", width: 12 },
        { key: "direction", header: "Direction", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ])
}

export function formatApplicationsList(data: unknown): string {
    const apps = Array.isArray(data) ? data : (data as any)?.applications || []

    if (apps.length === 0) {
        return chalk.dim("No applications found")
    }

    return formatTable(apps, [
        { key: "applicationId", header: "App ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "voiceUrl", header: "Voice URL", width: 40 },
    ])
}

export function formatIncomingNumbersList(data: unknown): string {
    const numbers = Array.isArray(data) ? data : (data as any)?.incomingPhoneNumbers || []

    if (numbers.length === 0) {
        return chalk.dim("No incoming numbers found")
    }

    return formatTable(numbers, [
        { key: "phoneNumberId", header: "Number ID", width: 24 },
        { key: "phoneNumber", header: "Phone Number", width: 15 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "applicationId", header: "App ID", width: 24 },
    ])
}

export function formatQueuesList(data: unknown): string {
    const queues = Array.isArray(data) ? data : (data as any)?.queues || []

    if (queues.length === 0) {
        return chalk.dim("No queues found")
    }

    return formatTable(queues, [
        { key: "queueId", header: "Queue ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "currentSize", header: "Size", width: 8 },
        { key: "maxSize", header: "Max", width: 8 },
        { key: "averageWaitTime", header: "Avg Wait", width: 10 },
    ])
}

export function formatConferencesList(data: unknown): string {
    const conferences = Array.isArray(data) ? data : (data as any)?.conferences || []

    if (conferences.length === 0) {
        return chalk.dim("No conferences found")
    }

    return formatTable(conferences, [
        { key: "conferenceId", header: "Conference ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "status", header: "Status", width: 12 },
        { key: "dateCreated", header: "Created", width: 22 },
    ])
}

export function formatRecordingsList(data: unknown): string {
    const recordings = Array.isArray(data) ? data : (data as any)?.recordings || []

    if (recordings.length === 0) {
        return chalk.dim("No recordings found")
    }

    return formatTable(recordings, [
        { key: "recordingId", header: "Recording ID", width: 24 },
        { key: "callId", header: "Call ID", width: 24 },
        { key: "durationSec", header: "Duration", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ])
}

export function formatLogsList(data: unknown): string {
    const logs = Array.isArray(data) ? data : (data as any)?.logs || []

    if (logs.length === 0) {
        return chalk.dim("No logs found")
    }

    return formatTable(logs, [
        { key: "timestamp", header: "Timestamp", width: 22 },
        { key: "level", header: "Level", width: 8 },
        { key: "requestId", header: "Request ID", width: 24 },
        { key: "message", header: "Message", width: 50 },
    ])
}

export function formatSingleItem(data: Record<string, unknown>): string {
    const lines: string[] = []
    const maxKeyLen = Math.max(...Object.keys(data).map((k) => k.length))

    for (const [key, value] of Object.entries(data)) {
        const formattedKey = chalk.cyan(key.padEnd(maxKeyLen))
        const formattedValue =
            typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)
        lines.push(`${formattedKey}  ${formattedValue}`)
    }

    return lines.join("\n")
}

export function getFormatterForTopic(
    topic: string,
    commandName: string,
): ((data: unknown) => string) | null {
    const formatters: Record<string, (data: unknown) => string> = {
        "calls:list": formatCallsList,
        "sms:list": formatSmsList,
        "applications:list": formatApplicationsList,
        "incoming-numbers:list": formatIncomingNumbersList,
        "call-queues:list": formatQueuesList,
        "conferences:list": formatConferencesList,
        "recordings:list": formatRecordingsList,
        "logs:list": formatLogsList,
        "logs:filter": formatLogsList,
    }

    const key = `${topic}:${commandName}`
    return formatters[key] || null
}
