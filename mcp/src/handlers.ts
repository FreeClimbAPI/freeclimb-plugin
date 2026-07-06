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
    listConferences,
    listQueues,
    rejectControlChars,
    validateUrl,
    ValidationError,
    parseDashboardSpec,
    PRESET_NAMES,
    loadPreset,
    generatePercl,
    validatePercl,
    type PerclPattern,
    type PresetName,
} from "@freeclimb/core"
import type { ToolName } from "./tools.js"
import { getDashboardPrompt } from "./prompts.js"

export interface HandlerContext {
    getAccount: typeof getAccount
    listCalls: typeof listCalls
    getCall: typeof getCall
    listMessages: typeof listMessages
    getMessage: typeof getMessage
    listIncomingNumbers: typeof listIncomingNumbers
    getIncomingNumber: typeof getIncomingNumber
    searchAvailableNumbers: typeof searchAvailableNumbers
    listApplications: typeof listApplications
    getApplication: typeof getApplication
    listLogs: typeof listLogs
    filterLogs: typeof filterLogs
    listRecordings: typeof listRecordings
    listConferences: typeof listConferences
    listQueues: typeof listQueues
}

export const defaultContext: HandlerContext = {
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
    listConferences,
    listQueues,
}

export type ToolHandler = (args: Record<string, unknown>, ctx: HandlerContext) => Promise<unknown>

export const handlers: { [K in ToolName]: ToolHandler } = {
    list_calls: async (args, ctx) =>
        ctx.listCalls({
            to: args.to as string | undefined,
            from: args.from as string | undefined,
            status: args.status as string | undefined,
        }),

    get_call: async (args, ctx) => ctx.getCall(args.callId as string),

    list_sms: async (args, ctx) =>
        ctx.listMessages({
            to: args.to as string | undefined,
            from: args.from as string | undefined,
        }),

    get_sms: async (args, ctx) => ctx.getMessage(args.messageId as string),

    list_numbers: async (_args, ctx) => ctx.listIncomingNumbers(),

    get_number: async (args, ctx) => ctx.getIncomingNumber(args.phoneNumberId as string),

    search_available_numbers: async (args, ctx) =>
        ctx.searchAvailableNumbers({
            areaCode: args.areaCode as string | undefined,
            country: args.country as string | undefined,
            smsEnabled: args.smsEnabled as boolean | undefined,
            voiceEnabled: args.voiceEnabled as boolean | undefined,
        }),

    list_applications: async (_args, ctx) => ctx.listApplications(),

    get_application: async (args, ctx) => ctx.getApplication(args.applicationId as string),

    get_account: async (_args, ctx) => ctx.getAccount(),

    list_logs: async (args, ctx) =>
        ctx.listLogs({ maxItems: args.maxItems as number | undefined }),

    filter_logs: async (args, ctx) =>
        ctx.filterLogs(args.pql as string, { maxItems: args.maxItems as number | undefined }),

    list_recordings: async (args, ctx) =>
        ctx.listRecordings({ callId: args.callId as string | undefined }),

    list_conferences: async (args, ctx) =>
        ctx.listConferences({ status: args.status as string | undefined }),

    list_queues: async (_args, ctx) => ctx.listQueues(),

    generate_dashboard_prompt: async (args) => {
        let result = getDashboardPrompt()
        if (args.preset) {
            const presetName = args.preset as string
            if (!PRESET_NAMES.includes(presetName as PresetName)) {
                throw new ValidationError(
                    `Unknown preset: ${presetName}. Available: ${PRESET_NAMES.join(", ")}`,
                )
            }
            const presetSpec = loadPreset(presetName as PresetName)
            result += `\n\n---\n\nHere is the "${presetName}" preset spec as a starting point:\n\n\`\`\`json\n${JSON.stringify(presetSpec, null, 2)}\n\`\`\``
        }
        return result
    },

    render_dashboard: async (args) => {
        const validatedSpec = parseDashboardSpec(args.spec)
        return {
            message: "Dashboard spec validated and ready to render in-IDE.",
            spec: validatedSpec,
        }
    },

    validate_percl: async (args) => validatePercl(args.percl),

    generate_percl: async (args) => {
        rejectControlChars(args.pattern as string | undefined, "pattern")
        rejectControlChars(args.text as string | undefined, "text")
        validateUrl(args.actionUrl as string | undefined, "actionUrl")
        return generatePercl(
            args.pattern as PerclPattern,
            args.text as string | undefined,
            args.actionUrl as string | undefined,
            args.options as Record<string, unknown> | undefined,
        )
    },
}

export async function dispatchTool(
    name: string,
    args: Record<string, unknown>,
    ctx: HandlerContext = defaultContext,
): Promise<unknown> {
    const handler = (handlers as Record<string, ToolHandler>)[name]
    if (!handler) {
        throw new Error(`Unknown tool: ${name}`)
    }
    return handler(args, ctx)
}
