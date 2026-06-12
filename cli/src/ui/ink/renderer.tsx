import type { ReactElement } from "react"
import { render, Box } from "ink"
import { getTerminalWidth } from "../theme.js"
import { Table, TableColumn } from "./table.js"
import { KeyValue } from "./key-value.js"
import { SuccessMessage } from "./success-message.js"
import { PaginationBar } from "./pagination-bar.js"
import { ErrorBox, ErrorBoxProps } from "./error-box.js"
import { JsonView } from "./json-view.js"
import { TerminalWidthProvider } from "./terminal-context.js"

// Topic → list key mapping (which property holds the array in the response)
const TOPIC_LIST_KEYS: Record<string, string> = {
    calls: "calls",
    sms: "messages",
    applications: "applications",
    "incoming-numbers": "incomingPhoneNumbers",
    "call-queues": "queues",
    conferences: "conferences",
    "conference-participants": "participants",
    recordings: "recordings",
    logs: "logs",
    "queue-members": "queueMembers",
    "available-numbers": "availablePhoneNumbers",
}

// Topic → column definitions for list views
const TOPIC_COLUMNS: Record<string, TableColumn[]> = {
    calls: [
        { key: "callId", header: "Call ID", width: 24 },
        { key: "from", header: "From", width: 15 },
        { key: "to", header: "To", width: 15 },
        { key: "status", header: "Status", width: 12 },
        { key: "direction", header: "Direction", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ],
    sms: [
        { key: "messageId", header: "Message ID", width: 24 },
        { key: "from", header: "From", width: 15 },
        { key: "to", header: "To", width: 15 },
        { key: "status", header: "Status", width: 12 },
        { key: "direction", header: "Direction", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ],
    applications: [
        { key: "applicationId", header: "App ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "voiceUrl", header: "Voice URL", width: 40 },
    ],
    "incoming-numbers": [
        { key: "phoneNumberId", header: "Number ID", width: 24 },
        { key: "phoneNumber", header: "Phone Number", width: 15 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "applicationId", header: "App ID", width: 24 },
    ],
    "call-queues": [
        { key: "queueId", header: "Queue ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "currentSize", header: "Size", width: 8 },
        { key: "maxSize", header: "Max", width: 8 },
        { key: "averageWaitTime", header: "Avg Wait", width: 10 },
    ],
    conferences: [
        { key: "conferenceId", header: "Conference ID", width: 24 },
        { key: "alias", header: "Alias", width: 20 },
        { key: "status", header: "Status", width: 12 },
        { key: "dateCreated", header: "Created", width: 22 },
    ],
    recordings: [
        { key: "recordingId", header: "Recording ID", width: 24 },
        { key: "callId", header: "Call ID", width: 24 },
        { key: "durationSec", header: "Duration", width: 10 },
        { key: "dateCreated", header: "Created", width: 22 },
    ],
    logs: [
        { key: "timestamp", header: "Timestamp", width: 22 },
        { key: "level", header: "Level", width: 8 },
        { key: "requestId", header: "Request ID", width: 24 },
        { key: "message", header: "Message", width: 50 },
    ],
}

/**
 * Render an Ink element to stdout and immediately unmount (static output).
 */
export function renderInk(element: ReactElement): void {
    const width = getTerminalWidth()
    const { unmount } = render(
        <TerminalWidthProvider value={width}>{element}</TerminalWidthProvider>,
    )
    unmount()
}

export interface RenderDataOptions {
    command?: string
    hasNext?: boolean
    pageNum?: number
    topic?: string
}

/**
 * Inspect data shape, pick the right Ink component, and render.
 */
export function renderData(data: unknown, options: RenderDataOptions = {}): void {
    const { topic, command, pageNum, hasNext } = options

    // Null/undefined data → success message (204-like)
    if (data === null || data === undefined) {
        renderInk(<SuccessMessage command={command ? `${topic}:${command}` : undefined} />)
        return
    }

    // Try to extract a list from the response
    const listKey = topic ? TOPIC_LIST_KEYS[topic] : undefined
    const dataObj = data as Record<string, unknown>
    const listData = listKey
        ? (dataObj[listKey] as Record<string, unknown>[] | undefined)
        : undefined

    if (listData && Array.isArray(listData)) {
        const columns = (topic && TOPIC_COLUMNS[topic]) || autoColumns(listData)
        const titleText = topic
            ? topic.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : undefined

        renderInk(
            <Box flexDirection="column">
                <Table columns={columns} rows={listData} title={titleText} />
                {pageNum !== undefined && (
                    <PaginationBar hasNext={hasNext || false} pageNum={pageNum} />
                )}
            </Box>,
        )
        return
    }

    // Single object → key-value view
    if (typeof data === "object" && !Array.isArray(data)) {
        renderInk(<KeyValue data={dataObj} />)
        return
    }

    // Array without known topic → JSON view
    if (Array.isArray(data)) {
        const columns = autoColumns(data as Record<string, unknown>[])
        renderInk(<Table columns={columns} rows={data as Record<string, unknown>[]} />)
        return
    }

    // Fallback → JSON
    renderInk(<JsonView data={data} />)
}

/**
 * Render an error using the ErrorBox component.
 */
export function renderError(props: ErrorBoxProps): void {
    renderInk(<ErrorBox {...props} />)
}

/**
 * Auto-generate columns from the first row of data.
 */
function autoColumns(rows: Record<string, unknown>[]): TableColumn[] {
    if (rows.length === 0) return []
    const keys = Object.keys(rows[0])
    return keys.slice(0, 8).map((key) => ({
        key,
        header: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
    }))
}
