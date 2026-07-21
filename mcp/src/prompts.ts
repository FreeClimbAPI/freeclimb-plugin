import { readResources } from "@freeclimb/core"

const DASHBOARD_SOURCE_NAMES = Object.keys(readResources)

export function getDashboardPrompt(): string {
    return [
        "Generate a privacy-safe FreeClimb snapshot dashboard rendered in-IDE via MCP Apps.",
        "Use declarative state bindings with $source and component values with absolute $state pointers.",
        "Supported sources are account, applications, calls, conferences, logs, numbers, queues, recordings, and sms.",
        "Supported components are Box, Heading, Card, Metric, KeyValue, Table, BarChart, Sparkline,",
        "StatusLine, LogStream, CallStatusCard, and QueueDepthGauge.",
        "Prefer aggregate counts and statuses. Do not display account IDs, resource IDs, phone numbers,",
        "SMS bodies, log text, credentials, arbitrary HTML, scripts, styles, URLs, or actions.",
        "Call render_dashboard with the completed spec. Call it again when the user asks to refresh.",
    ].join(" ")
}

export interface PromptArgument {
    description: string
    name: string
    required: boolean
}

export interface PromptDefinition {
    arguments?: PromptArgument[]
    description: string
    name: string
}

export const promptDefinitions: PromptDefinition[] = [
    {
        name: "diagnose",
        description: "Run FreeClimb CLI diagnostics to check connectivity and authentication",
    },
    {
        name: "dashboard",
        description: "Generate an in-IDE snapshot dashboard for FreeClimb resources",
        arguments: [
            {
                name: "focus",
                description: "What to monitor: calls, queues, sms, or health",
                required: false,
            },
        ],
    },
]

export interface PromptMessage {
    content: { text: string; type: "text" }
    role: "user"
}

export interface PromptResult {
    [key: string]: unknown
    description: string
    messages: PromptMessage[]
}

export function getPrompt(name: string, args?: Record<string, string>): PromptResult {
    switch (name) {
        case "diagnose": {
            return {
                description: "Run FreeClimb CLI diagnostics",
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: "Run diagnostics on the FreeClimb CLI setup. Use the get_account tool to verify connectivity and authentication, then report the account status.",
                        },
                    },
                ],
            }
        }
        case "dashboard": {
            const focus = args?.focus || "general"
            const prompt = getDashboardPrompt()
            return {
                description: "Generate a FreeClimb monitoring dashboard",
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: `${prompt}\n\nGenerate an in-IDE snapshot dashboard focused on: ${focus}. Use the FreeClimb data sources (${DASHBOARD_SOURCE_NAMES.join(", ")}) with $source bindings in the state, then call render_dashboard.`,
                        },
                    },
                ],
            }
        }
        default: {
            throw new Error(`Unknown prompt: ${name}`)
        }
    }
}
