import type { ReactElement } from "react"
import { render, Box } from "ink"
import { getViewForCliTopic, viewColumns } from "@freeclimb/core"
import { viewColumnsToTableColumns } from "../format.js"
import { getTerminalWidth } from "../theme.js"
import { Table, TableColumn } from "./table.js"
import { KeyValue } from "./key-value.js"
import { SuccessMessage } from "./success-message.js"
import { PaginationBar } from "./pagination-bar.js"
import { ErrorBox, ErrorBoxProps } from "./error-box.js"
import { JsonView } from "./json-view.js"
import { TerminalWidthProvider } from "./terminal-context.js"

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

    const view = topic ? getViewForCliTopic(topic) : undefined
    const listKey = view?.listKey
    const dataObj = data as Record<string, unknown>
    const listData = listKey
        ? (dataObj[listKey] as Record<string, unknown>[] | undefined)
        : undefined

    if (listData && Array.isArray(listData)) {
        const columns: TableColumn[] = view
            ? viewColumnsToTableColumns(viewColumns(view, "wide"))
            : autoColumns(listData)
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
