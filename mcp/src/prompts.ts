export function getDashboardPrompt(): string {
    return [
        "You are generating a FreeClimb monitoring view rendered in-IDE via the MCP Apps UI.",
        "Available structured views: table (list results) and account card.",
        "Pick a focus: calls, queues, sms, or health, then call the matching list tool",
        "(list_calls, list_queues, list_sms, get_account / list_logs) so results render as",
        "FreeClimb-themed cards and tables. Use render_dashboard with a json-render spec only",
        "when you need a composed multi-panel layout; otherwise prefer the list tools directly.",
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
        description: "Generate a custom terminal monitoring dashboard for FreeClimb resources",
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
                            text: `${prompt}\n\nGenerate a terminal dashboard spec focused on: ${focus}. Use the FreeClimb data sources (calls, sms, queues, conferences, account, logs, numbers, applications) with $source bindings in the state. After generating the spec, use the render_dashboard tool to save and render it.`,
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
