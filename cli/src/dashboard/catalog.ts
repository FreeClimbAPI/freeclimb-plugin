import { defineCatalog } from "@json-render/core"
import {
    schema,
    standardComponentDefinitions,
    standardActionDefinitions,
    standardComponents,
    createRenderer,
} from "@json-render/ink"
import { z } from "zod"
import { BrandColors } from "../ui/theme.js"
import { CallStatusCard } from "./components/call-status-card.js"
import { QueueDepthGauge } from "./components/queue-depth-gauge.js"
import { LogStream } from "./components/log-stream.js"
import { BrandCard, BrandHeading, BrandMetric, BrandTable } from "./components/branded.js"

const customComponentDefinitions = {
    CallStatusCard: {
        props: z.object({
            callId: z.string(),
            from: z.string(),
            to: z.string(),
            status: z.string(),
            direction: z.string().nullable().default(null),
            duration: z.number().nullable().default(null),
        }),
        description:
            "A FreeClimb call record card showing call ID, from/to numbers, status badge, direction, and duration. Use for individual call details.",
    },
    QueueDepthGauge: {
        props: z.object({
            alias: z.string(),
            currentSize: z.number(),
            maxSize: z.number(),
            averageWaitTime: z.number().nullable().default(null),
        }),
        description:
            "A gauge showing queue fill level as a progress bar with queue name, current/max size, and average wait time. Use for queue monitoring.",
    },
    LogStream: {
        props: z.object({
            entries: z.array(
                z.object({
                    timestamp: z.string(),
                    level: z.string(),
                    message: z.string(),
                }),
            ),
            maxLines: z.number().nullable().default(null),
        }),
        description:
            "A scrollable log view with level-based coloring (error=red, warning=yellow, info=blue). Use for showing recent log entries.",
    },
}

export const freeclimbCatalog = defineCatalog(schema, {
    components: {
        ...standardComponentDefinitions,
        ...customComponentDefinitions,
    },
    actions: standardActionDefinitions,
})

// json-render's ComponentMap generic requires ComponentRenderProps wrappers; custom components receive resolved props directly
export const FreeclimbRenderer = createRenderer(freeclimbCatalog, {
    ...standardComponents,
    Card: BrandCard,
    Heading: BrandHeading,
    Metric: BrandMetric,
    Table: BrandTable,
    CallStatusCard,
    QueueDepthGauge,
    LogStream,
} as any)

const MAX_CUSTOM_RULES = 50
const MAX_RULE_LENGTH = 500

export function getDashboardPrompt(customRules?: string[]): string {
    if (customRules && customRules.length > MAX_CUSTOM_RULES) {
        throw new Error(`Too many custom rules (max ${MAX_CUSTOM_RULES})`)
    }
    const safeRules = customRules?.map((r) =>
        r.length > MAX_RULE_LENGTH ? r.slice(0, MAX_RULE_LENGTH) : r,
    )
    const rules = [
        `Use FreeClimb brand colors: lightTeal=${BrandColors.lightTeal}, orange=${BrandColors.orange}, lime=${BrandColors.lime}`,
        "Use Metric components for KPI cards at the top of dashboards",
        "Use Table for listing resources (calls, SMS, queues)",
        "Use BarChart or Sparkline for visualizing counts by status",
        "Use CallStatusCard for individual call details",
        "Use QueueDepthGauge for queue fill levels",
        "Use LogStream for log entries",
        "Use StatusLine for refresh timestamps and status messages",
        "Wrap sections in Card components with descriptive titles",
        "Use Box with flexDirection='row' to place metrics side by side",
        ...(safeRules || []),
    ]

    return freeclimbCatalog.prompt({
        system: "You are a FreeClimb monitoring dashboard generator. Generate terminal UI dashboards for monitoring voice calls, SMS messages, queues, conferences, and system health using the FreeClimb communications API.",
        customRules: rules,
    })
}
