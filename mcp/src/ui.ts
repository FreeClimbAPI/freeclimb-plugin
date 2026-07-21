import {
    getResourceView,
    viewCellValue,
    viewColumns,
    type ResourceViewName,
} from "@freeclimb/core"
import type { ToolName } from "./registry.js"
import {
    buildAccountPayload,
    buildApplicationCardPayload,
    buildCallPayload,
    type CardPayload,
} from "./ui-cards.js"
import { formatDate, toText } from "./ui-format.js"

export { TABLE_HTML } from "./ui-html.js"
export {
    buildAccountPayload,
    buildApplicationCardPayload,
    buildCallPayload,
    type CardField,
    type CardPayload,
} from "./ui-cards.js"

export const UI_TABLE_URI = "ui://freeclimb/table"
export const UI_TABLE_MIME = "text/html;profile=mcp-app"

export const UI_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
    "list_sms",
    "list_calls",
    "list_numbers",
    "list_applications",
    "list_conferences",
    "list_queues",
    "list_logs",
    "list_call_logs",
    "list_conference_participants",
    "list_queue_members",
    "list_brands",
    "list_campaigns",
    "list_partner_campaigns",
    "list_exports",
    "search_available_numbers",
    "get_account",
    "get_call",
    "get_application",
])

export interface TableColumn {
    header: string
    key: string
}

export interface TablePayload {
    columns: TableColumn[]
    eyebrow: string
    rows: Array<Record<string, string>>
    statusKey?: string
    title: string
}

const TOOL_VIEW_MAP: Partial<Record<ToolName, ResourceViewName>> = {
    list_calls: "calls",
    list_sms: "sms",
    list_numbers: "numbers",
    search_available_numbers: "availableNumbers",
    list_applications: "applications",
    list_conferences: "conferences",
    list_queues: "queues",
    list_logs: "logs",
    list_call_logs: "logs",
    list_conference_participants: "participants",
    list_queue_members: "queueMembers",
    list_brands: "brands",
    list_campaigns: "campaigns",
    list_partner_campaigns: "campaigns",
    list_exports: "exports",
}

function asArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

function buildRowsFromView(
    view: NonNullable<ReturnType<typeof getResourceView>>,
    items: Array<Record<string, unknown>>,
): Array<Record<string, string>> {
    const columns = viewColumns(view, "compact")
    return items.map((row) => {
        const out: Record<string, string> = {}
        for (const column of columns) {
            const raw = viewCellValue(column, row)
            out[column.key] = column.date ? formatDate(raw) : toText(raw)
        }
        return out
    })
}

export function buildTablePayload(toolName: ToolName, data: unknown): TablePayload | undefined {
    const viewName = TOOL_VIEW_MAP[toolName]
    if (!viewName) return undefined

    const view = getResourceView(viewName)
    if (!view) return undefined

    const root = (data ?? {}) as Record<string, unknown>
    const items = asArray(root[view.listKey])
    const columns = viewColumns(view, "compact").map((column) => ({
        key: column.key,
        header: column.header,
    }))

    return {
        eyebrow: view.eyebrow,
        title: view.title,
        statusKey: view.statusKey,
        columns,
        rows: buildRowsFromView(view, items),
    }
}

export function buildUiPayload(
    toolName: ToolName,
    data: unknown,
): { table: TablePayload } | { card: CardPayload } | undefined {
    switch (toolName) {
        case "get_account":
            return { card: buildAccountPayload(data) }
        case "get_call":
            return { card: buildCallPayload(data) }
        case "get_application":
            return { card: buildApplicationCardPayload(data) }
        default: {
            const table = buildTablePayload(toolName, data)
            return table ? { table } : undefined
        }
    }
}
