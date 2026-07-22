import {
    getAccount,
    listCalls,
    getCall,
    listMessages,
    getMessage,
    listIncomingNumbers,
    getIncomingNumber,
    searchAvailableNumbers,
    listApplications,
    getApplication,
    listLogs,
    filterLogs,
    listRecordings,
    getRecording,
    listCallLogs,
    listConferences,
    getConference,
    listConferenceParticipants,
    listQueues,
    getQueue,
    listQueueMembers,
    listBrands,
    getBrand,
    listCampaigns,
    getCampaign,
    listPartnerCampaigns,
    getPartnerCampaign,
    listExports,
    getExport,
    parseDashboardSpec,
    validateSourceBindings,
    resolveDashboardSnapshot,
    loadPreset,
    type PresetName,
} from "@freeclimb/core"
import { getDashboardPrompt } from "./prompts.js"
import { buildDashboardPayload } from "./dashboard-ui.js"
import {
    optionalBoolean,
    optionalNumber,
    optionalString,
    parseToolArgs,
    requiredObject,
    requiredString,
    type ToolInputSchema,
} from "./parse-args.js"

export const defaultContext = {
    getAccount,
    listCalls,
    getCall,
    listMessages,
    getMessage,
    listIncomingNumbers,
    getIncomingNumber,
    searchAvailableNumbers,
    listApplications,
    getApplication,
    listLogs,
    filterLogs,
    listRecordings,
    getRecording,
    listCallLogs,
    listConferences,
    getConference,
    listConferenceParticipants,
    listQueues,
    getQueue,
    listQueueMembers,
    listBrands,
    getBrand,
    listCampaigns,
    getCampaign,
    listPartnerCampaigns,
    getPartnerCampaign,
    listExports,
    getExport,
    resolveDashboardSnapshot,
}

export type HandlerContext = typeof defaultContext

export type ToolHandler = (
    args: Record<string, unknown>,
    ctx: HandlerContext,
) => Promise<unknown>

export interface ToolEntry {
    description: string
    handler: ToolHandler
    inputSchema: ToolInputSchema
    name: string
}

function deriveRegistry<T extends Record<string, ToolEntry>>(registry: T) {
    return {
        tools: Object.fromEntries(
            Object.entries(registry).map(([key, entry]) => [
                key,
                {
                    name: entry.name,
                    description: entry.description,
                    inputSchema: entry.inputSchema,
                },
            ]),
        ) as { [K in keyof T]: Pick<T[K], "name" | "description" | "inputSchema"> },
        handlers: Object.fromEntries(
            Object.entries(registry).map(([key, entry]) => [key, entry.handler]),
        ) as { [K in keyof T]: T[K]["handler"] },
    }
}

export const toolRegistry = {
    list_calls: {
        name: "list_calls",
        description: "List recent phone calls for the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                status: {
                    type: "string",
                    description: "Filter by call status: queued, ringing, inProgress, canceled, completed, failed, busy, noAnswer",
                    enum: [
                        "queued",
                        "ringing",
                        "inProgress",
                        "canceled",
                        "completed",
                        "failed",
                        "busy",
                        "noAnswer",
                    ],
                },
                to: {
                    type: "string",
                    description: "Filter by destination phone number",
                },
                from: {
                    type: "string",
                    description: "Filter by source phone number",
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) =>
            ctx.listCalls({
                to: optionalString(args, "to"),
                from: optionalString(args, "from"),
                status: optionalString(args, "status"),
            }),
    },

    get_call: {
        name: "get_call",
        description: "Get details for a specific call by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                callId: {
                    type: "string",
                    description: "The call ID to look up",
                },
            },
            required: [
                "callId",
            ],
        },
        handler: async (args, ctx) => ctx.getCall(requiredString(args, "callId")),
    },

    list_sms: {
        name: "list_sms",
        description: "List recent SMS messages for the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                to: {
                    type: "string",
                    description: "Filter by destination phone number",
                },
                from: {
                    type: "string",
                    description: "Filter by source phone number",
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) =>
            ctx.listMessages({
                to: optionalString(args, "to"),
                from: optionalString(args, "from"),
            }),
    },

    get_sms: {
        name: "get_sms",
        description: "Get details for a specific SMS message by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                messageId: {
                    type: "string",
                    description: "The message ID to look up",
                },
            },
            required: [
                "messageId",
            ],
        },
        handler: async (args, ctx) => ctx.getMessage(requiredString(args, "messageId")),
    },

    list_numbers: {
        name: "list_numbers",
        description: "List all phone numbers owned by the account",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listIncomingNumbers(),
    },

    get_number: {
        name: "get_number",
        description: "Get details for a specific phone number",
        inputSchema: {
            type: "object" as const,
            properties: {
                phoneNumberId: {
                    type: "string",
                    description: "The phone number ID to look up",
                },
            },
            required: [
                "phoneNumberId",
            ],
        },
        handler: async (args, ctx) => ctx.getIncomingNumber(requiredString(args, "phoneNumberId")),
    },

    search_available_numbers: {
        name: "search_available_numbers",
        description: "Search for phone numbers available to purchase",
        inputSchema: {
            type: "object" as const,
            properties: {
                areaCode: {
                    type: "string",
                    description: "Filter by area code (e.g., 415)",
                },
                country: {
                    type: "string",
                    description: "Two-letter country code (default: US)",
                },
                smsEnabled: {
                    type: "boolean",
                    description: "Filter for SMS-enabled numbers",
                },
                voiceEnabled: {
                    type: "boolean",
                    description: "Filter for voice-enabled numbers",
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) =>
            ctx.searchAvailableNumbers({
                areaCode: optionalString(args, "areaCode"),
                country: optionalString(args, "country"),
                smsEnabled: optionalBoolean(args, "smsEnabled"),
                voiceEnabled: optionalBoolean(args, "voiceEnabled"),
            }),
    },

    list_applications: {
        name: "list_applications",
        description: "List all applications in the account",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listApplications(),
    },

    get_application: {
        name: "get_application",
        description: "Get details for a specific application",
        inputSchema: {
            type: "object" as const,
            properties: {
                applicationId: {
                    type: "string",
                    description: "The application ID to look up",
                },
            },
            required: [
                "applicationId",
            ],
        },
        handler: async (args, ctx) => ctx.getApplication(requiredString(args, "applicationId")),
    },

    get_account: {
        name: "get_account",
        description: "Get account information and current status",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.getAccount(),
    },

    list_logs: {
        name: "list_logs",
        description: "List recent logs for the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                maxItems: {
                    type: "number",
                    description: "Maximum number of log entries to return (default: 100)",
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) => ctx.listLogs({ maxItems: optionalNumber(args, "maxItems") }),
    },

    filter_logs: {
        name: "filter_logs",
        description: "Filter logs using PQL (FreeClimb Query Language)",
        inputSchema: {
            type: "object" as const,
            properties: {
                pql: {
                    type: "string",
                    description: "PQL query string (e.g., \"level = \\\"ERROR\\\"\")",
                },
                maxItems: {
                    type: "number",
                    description: "Maximum number of log entries to return",
                },
            },
            required: [
                "pql",
            ],
        },
        handler: async (args, ctx) =>
            ctx.filterLogs(requiredString(args, "pql"), {
                maxItems: optionalNumber(args, "maxItems"),
            }),
    },

    list_recordings: {
        name: "list_recordings",
        description: "List all recordings in the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                callId: {
                    type: "string",
                    description: "Filter by call ID",
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) => ctx.listRecordings({ callId: optionalString(args, "callId") }),
    },

    list_conferences: {
        name: "list_conferences",
        description: "List all conferences in the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                status: {
                    type: "string",
                    description: "Filter by conference status",
                    enum: [
                        "empty",
                        "populated",
                        "inProgress",
                        "terminated",
                    ],
                },
            },
            required: [
            ],
        },
        handler: async (args, ctx) => ctx.listConferences({ status: optionalString(args, "status") }),
    },

    list_queues: {
        name: "list_queues",
        description: "List all call queues in the account",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listQueues(),
    },

    get_recording: {
        name: "get_recording",
        description: "Get metadata for a specific call recording by ID. Returns recording details only — does not download or stream audio.",
        inputSchema: {
            type: "object" as const,
            properties: {
                recordingId: {
                    type: "string",
                    description: "The recording ID to look up",
                },
            },
            required: [
                "recordingId",
            ],
        },
        handler: async (args, ctx) => ctx.getRecording(requiredString(args, "recordingId")),
    },

    list_call_logs: {
        name: "list_call_logs",
        description: "List debug logs for a specific call. Use during incident triage to trace webhook delivery, PerCL execution, and errors for one call.",
        inputSchema: {
            type: "object" as const,
            properties: {
                callId: {
                    type: "string",
                    description: "The call ID whose logs to retrieve",
                },
            },
            required: [
                "callId",
            ],
        },
        handler: async (args, ctx) => ctx.listCallLogs(requiredString(args, "callId")),
    },

    get_conference: {
        name: "get_conference",
        description: "Get details for a specific conference by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                conferenceId: {
                    type: "string",
                    description: "The conference ID to look up",
                },
            },
            required: [
                "conferenceId",
            ],
        },
        handler: async (args, ctx) => ctx.getConference(requiredString(args, "conferenceId")),
    },

    list_conference_participants: {
        name: "list_conference_participants",
        description: "List participants currently or recently joined to a conference. Use to inspect who is in a live or ended conference.",
        inputSchema: {
            type: "object" as const,
            properties: {
                conferenceId: {
                    type: "string",
                    description: "The conference ID whose participants to list",
                },
            },
            required: [
                "conferenceId",
            ],
        },
        handler: async (args, ctx) =>
            ctx.listConferenceParticipants(requiredString(args, "conferenceId")),
    },

    get_queue: {
        name: "get_queue",
        description: "Get details for a specific call queue by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                queueId: {
                    type: "string",
                    description: "The queue ID to look up",
                },
            },
            required: [
                "queueId",
            ],
        },
        handler: async (args, ctx) => ctx.getQueue(requiredString(args, "queueId")),
    },

    list_queue_members: {
        name: "list_queue_members",
        description: "List calls currently waiting in a queue. Use to inspect queue depth and wait times for a specific queue.",
        inputSchema: {
            type: "object" as const,
            properties: {
                queueId: {
                    type: "string",
                    description: "The queue ID whose waiting members to list",
                },
            },
            required: [
                "queueId",
            ],
        },
        handler: async (args, ctx) => ctx.listQueueMembers(requiredString(args, "queueId")),
    },

    list_brands: {
        name: "list_brands",
        description: "List 10DLC brands registered for SMS compliance. Use when investigating brand registration status or linking campaigns to brands.",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listBrands(),
    },

    get_brand: {
        name: "get_brand",
        description: "Get details for a specific 10DLC brand by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                brandId: {
                    type: "string",
                    description: "The brand ID to look up",
                },
            },
            required: [
                "brandId",
            ],
        },
        handler: async (args, ctx) => ctx.getBrand(requiredString(args, "brandId")),
    },

    list_campaigns: {
        name: "list_campaigns",
        description: "List 10DLC campaigns for the account. Use when checking campaign registration status or SMS use-case compliance.",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listCampaigns(),
    },

    get_campaign: {
        name: "get_campaign",
        description: "Get details for a specific 10DLC campaign by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                campaignId: {
                    type: "string",
                    description: "The campaign ID to look up",
                },
            },
            required: [
                "campaignId",
            ],
        },
        handler: async (args, ctx) => ctx.getCampaign(requiredString(args, "campaignId")),
    },

    list_partner_campaigns: {
        name: "list_partner_campaigns",
        description: "List partner 10DLC campaigns shared with the account. Use when the account sends SMS through a partner-managed campaign.",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listPartnerCampaigns(),
    },

    get_partner_campaign: {
        name: "get_partner_campaign",
        description: "Get details for a specific partner 10DLC campaign by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                campaignId: {
                    type: "string",
                    description: "The partner campaign ID to look up",
                },
            },
            required: [
                "campaignId",
            ],
        },
        handler: async (args, ctx) => ctx.getPartnerCampaign(requiredString(args, "campaignId")),
    },

    list_exports: {
        name: "list_exports",
        description: "List data export jobs for the account. Use to check bulk export status or find completed export downloads.",
        inputSchema: {
            type: "object" as const,
            properties: {
            },
            required: [
            ],
        },
        handler: async (_args, ctx) => ctx.listExports(),
    },

    get_export: {
        name: "get_export",
        description: "Get details for a specific data export job by its ID",
        inputSchema: {
            type: "object" as const,
            properties: {
                exportId: {
                    type: "string",
                    description: "The export ID to look up",
                },
            },
            required: [
                "exportId",
            ],
        },
        handler: async (args, ctx) => ctx.getExport(requiredString(args, "exportId")),
    },

    generate_dashboard_prompt: {
        name: "generate_dashboard_prompt",
        description: "Get the supported sources, components, privacy constraints, and optional preset for generating an in-IDE FreeClimb snapshot dashboard.",
        inputSchema: {
            type: "object" as const,
            properties: {
                preset: {
                    type: "string",
                    description: "Optionally include a preset dashboard spec as a starting point",
                    enum: [
                        "calls",
                        "queues",
                        "sms",
                        "health",
                    ],
                },
            },
            required: [
            ],
        },
        handler: async (args) => {
            let result = getDashboardPrompt()
            const presetName = optionalString(args, "preset")
            if (presetName) {
                const presetSpec = loadPreset(presetName as PresetName)
                result +=
                    "\n\n---\n\nHere is the \"" +
                    presetName +
                    "\" preset spec as a starting point:\n\n```json\n" +
                    JSON.stringify(presetSpec, null, 2) +
                    "\n```"
            }
            return result
        },
    },

    render_dashboard: {
        name: "render_dashboard",
        description: "Render a privacy-safe, point-in-time FreeClimb dashboard in the IDE from a validated json-render spec with read-only data source bindings. Call again to refresh.",
        inputSchema: {
            type: "object" as const,
            properties: {
                spec: {
                    type: "object",
                    description: "The json-render dashboard spec to render",
                },
            },
            required: [
                "spec",
            ],
        },
        handler: async (args, ctx) => {
            const spec = requiredObject(args, "spec")
            const validatedSpec = parseDashboardSpec(spec)
            validateSourceBindings(validatedSpec)
            const snapshot = await ctx.resolveDashboardSnapshot(validatedSpec)
            return {
                dashboard: buildDashboardPayload(validatedSpec, snapshot),
                message: "FreeClimb dashboard snapshot rendered in-IDE.",
            }
        },
    }
} satisfies Record<string, ToolEntry>

export type ToolName = keyof typeof toolRegistry

const derived = deriveRegistry(toolRegistry)
export const tools = derived.tools
export const handlers = derived.handlers

export async function dispatchTool(
    name: string,
    args: Record<string, unknown>,
    ctx: HandlerContext = defaultContext,
): Promise<unknown> {
    if (!(name in toolRegistry)) {
        throw new Error(`Unknown tool: ${name}`)
    }
    const entry = toolRegistry[name as ToolName]
    const parsed = parseToolArgs(entry.inputSchema, args)
    return entry.handler(parsed, ctx)
}
