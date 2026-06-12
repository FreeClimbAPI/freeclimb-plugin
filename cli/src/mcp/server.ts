/**
 * FreeClimb MCP Server
 *
 * Exposes FreeClimb CLI functionality as an MCP server for AI agents.
 * Uses the official @modelcontextprotocol/sdk for protocol compliance.
 */

import { Server } from "@modelcontextprotocol/sdk/server"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { tmpdir } from "node:os"
import { createApiAxios } from "../http.js"
import {
    validateResourceId,
    validatePhoneNumber,
    rejectControlChars,
    validateUrl,
    ValidationError,
} from "../validation.js"
import { parseDashboardSpec, PRESET_NAMES } from "../dashboard/types.js"
import type { PresetName } from "../dashboard/types.js"
import { tools, ToolName } from "./tools.js"
import { UI_TABLE_URI, UI_TABLE_MIME, UI_TOOLS, TABLE_HTML, buildUiPayload } from "./ui.js"

// Lazy-loaded to avoid pulling React/Ink into MCP server startup
async function getDashboardPromptLazy(): Promise<string> {
    const { getDashboardPrompt } = await import("../dashboard/catalog.js")
    return getDashboardPrompt()
}

async function loadPresetLazy(name: PresetName): Promise<unknown> {
    const { loadPreset } = await import("../dashboard/presets/index.js")
    return loadPreset(name)
}

const currentDir = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(currentDir, "../../package.json")
const { version: CLI_VERSION } = JSON.parse(readFileSync(pkgPath, "utf-8"))
const SKILLS_DIR = join(currentDir, "../../skills")

// Generate PerCL JSON for common call flow patterns
function generatePerclPattern(
    pattern: string,
    text?: string,
    actionUrl?: string,
    options?: Record<string, unknown>,
): unknown[] {
    switch (pattern) {
        case "greeting": {
            return [{ Say: { text: text || "Thank you for calling. Goodbye." } }, { Hangup: {} }]
        }

        case "menu": {
            return [
                {
                    GetDigits: {
                        actionUrl: actionUrl || "https://example.com/menu-handler",
                        prompts: [
                            {
                                Say: {
                                    text:
                                        text ||
                                        "Press 1 for sales. Press 2 for support. Press 0 for an operator.",
                                },
                            },
                        ],
                        maxDigits: (options?.maxDigits as number) || 1,
                        minDigits: 1,
                        initialTimeoutMs: 8000,
                        flushBuffer: true,
                    },
                },
            ]
        }

        case "voicemail": {
            return [
                {
                    Say: {
                        text:
                            text ||
                            "Please leave a message after the beep. Press pound when finished.",
                    },
                },
                {
                    RecordUtterance: {
                        actionUrl: actionUrl || "https://example.com/voicemail-saved",
                        silenceTimeoutMs: 5000,
                        maxLengthSec: (options?.maxLengthSec as number) || 120,
                        finishOnKey: (options?.finishOnKey as string) || "#",
                        playBeep: true,
                    },
                },
            ]
        }

        case "transfer": {
            return [
                { Say: { text: text || "Transferring your call. Please hold." } },
                {
                    OutDial: {
                        destination: (options?.destination as string) || "+15551234567",
                        callingNumber: (options?.callingNumber as string) || "+15559876543",
                        actionUrl: actionUrl || "https://example.com/transfer-status",
                        callConnectUrl:
                            (options?.callConnectUrl as string) || "https://example.com/connected",
                        timeout: 30,
                    },
                },
            ]
        }

        case "queue": {
            return [
                { Say: { text: text || "Please hold while we connect you with an agent." } },
                {
                    Enqueue: {
                        queueId: (options?.queueId as string) || "QU...",
                        waitUrl: (options?.waitUrl as string) || "https://example.com/hold-music",
                        actionUrl: actionUrl || "https://example.com/dequeued",
                    },
                },
            ]
        }

        case "record": {
            return [
                {
                    Say: {
                        text:
                            text || "This call may be recorded for quality and training purposes.",
                    },
                },
                { StartRecordCall: {} },
            ]
        }

        default: {
            throw new Error(
                `Unknown pattern: ${pattern}. Supported: greeting, menu, voicemail, transfer, queue, record`,
            )
        }
    }
}

// Discover skill files from skills/ directory
function discoverSkillResources(): Array<{
    description: string
    name: string
    path: string
    uri: string
}> {
    const resources: Array<{ description: string; name: string; path: string; uri: string }> = []

    if (!existsSync(SKILLS_DIR)) return resources

    try {
        const manifest = JSON.parse(readFileSync(join(SKILLS_DIR, "manifest.json"), "utf-8"))
        for (const skill of manifest.skills) {
            const filePath = join(SKILLS_DIR, skill.path)
            if (existsSync(filePath)) {
                resources.push({
                    uri: `freeclimb://skills/${skill.id}`,
                    name: skill.name,
                    description: skill.description,
                    path: filePath,
                })
            }
        }
    } catch {
        // If manifest doesn't exist or can't be parsed, skip skill resources
    }

    return resources
}

// Tool handler
async function handleToolCall(name: ToolName, args: Record<string, unknown>): Promise<unknown> {
    const client = await createApiAxios()

    switch (name) {
        // Call management
        case "make_call": {
            validatePhoneNumber(args.to as string | undefined, "to")
            validatePhoneNumber(args.from as string | undefined, "from")
            validateResourceId(args.applicationId as string | undefined, "applicationId")
            return (
                await client.post("/Calls", {
                    to: args.to,
                    from: args.from,
                    applicationId: args.applicationId,
                    timeout: args.timeout || 30,
                })
            ).data
        }

        case "list_calls": {
            validatePhoneNumber(args.to as string | undefined, "to")
            validatePhoneNumber(args.from as string | undefined, "from")
            return (
                await client.get("/Calls", {
                    params: {
                        to: args.to,
                        from: args.from,
                        status: args.status,
                    },
                })
            ).data
        }

        case "get_call": {
            validateResourceId(args.callId as string | undefined, "callId")
            return (await client.get(`/Calls/${args.callId}`)).data
        }

        // SMS management
        case "send_sms": {
            validatePhoneNumber(args.to as string | undefined, "to")
            validatePhoneNumber(args.from as string | undefined, "from")
            rejectControlChars(args.text as string | undefined, "text")
            return (
                await client.post("/Messages", {
                    to: args.to,
                    from: args.from,
                    text: args.text,
                })
            ).data
        }

        case "list_sms": {
            validatePhoneNumber(args.to as string | undefined, "to")
            validatePhoneNumber(args.from as string | undefined, "from")
            return (
                await client.get("/Messages", {
                    params: {
                        to: args.to,
                        from: args.from,
                    },
                })
            ).data
        }

        case "get_sms": {
            validateResourceId(args.messageId as string | undefined, "messageId")
            return (await client.get(`/Messages/${args.messageId}`)).data
        }

        // Phone number management
        case "list_numbers": {
            return (await client.get("/IncomingPhoneNumbers")).data
        }

        case "get_number": {
            validateResourceId(args.phoneNumberId as string | undefined, "phoneNumberId")
            return (await client.get(`/IncomingPhoneNumbers/${args.phoneNumberId}`)).data
        }

        case "search_available_numbers": {
            return (
                await client.get("/AvailablePhoneNumbers", {
                    params: {
                        areaCode: args.areaCode,
                        country: args.country || "US",
                        smsEnabled: args.smsEnabled,
                        voiceEnabled: args.voiceEnabled,
                    },
                })
            ).data
        }

        // Application management
        case "list_applications": {
            return (await client.get("/Applications")).data
        }

        case "get_application": {
            validateResourceId(args.applicationId as string | undefined, "applicationId")
            return (await client.get(`/Applications/${args.applicationId}`)).data
        }

        // Account information
        case "get_account": {
            return (await client.get("")).data
        }

        // Logs
        case "list_logs": {
            return (
                await client.get("/Logs", {
                    params: {
                        maxItems: args.maxItems || 100,
                    },
                })
            ).data
        }

        case "filter_logs": {
            rejectControlChars(args.pql as string | undefined, "pql")
            return (
                await client.post("/Logs", {
                    pql: args.pql,
                    maxItems: args.maxItems,
                })
            ).data
        }

        // Recordings
        case "list_recordings": {
            if (args.callId) {
                validateResourceId(args.callId as string, "callId")
            }
            return (
                await client.get("/Recordings", {
                    params: {
                        callId: args.callId,
                    },
                })
            ).data
        }

        // Conferences
        case "list_conferences": {
            return (
                await client.get("/Conferences", {
                    params: {
                        status: args.status,
                    },
                })
            ).data
        }

        // Queues
        case "list_queues": {
            return (await client.get("/Queues")).data
        }

        // Call update
        case "update_call": {
            validateResourceId(args.callId as string | undefined, "callId")
            return (
                await client.put(`/Calls/${args.callId}`, {
                    status: args.status,
                })
            ).data
        }

        // Dashboard generation (local, no API call)
        case "generate_dashboard_prompt": {
            const prompt = await getDashboardPromptLazy()
            let result = prompt
            if (args.preset) {
                const presetName = args.preset as string
                if (!PRESET_NAMES.includes(presetName as PresetName)) {
                    throw new ValidationError(
                        `Unknown preset: ${presetName}. Available: ${PRESET_NAMES.join(", ")}`,
                    )
                }
                const presetSpec = await loadPresetLazy(presetName as PresetName)
                result += `\n\n---\n\nHere is the "${presetName}" preset spec as a starting point:\n\n\`\`\`json\n${JSON.stringify(presetSpec, null, 2)}\n\`\`\``
            }
            return result
        }

        case "render_dashboard": {
            const validatedSpec = parseDashboardSpec(args.spec)
            const specJson = JSON.stringify(validatedSpec, null, 2)
            const tmpPath = join(tmpdir(), `freeclimb-dashboard-${Date.now()}.json`)
            writeFileSync(tmpPath, specJson, "utf-8")
            const refresh =
                typeof args.refresh === "number"
                    ? Math.max(10, Math.min(3600, args.refresh))
                    : undefined
            const refreshFlag = refresh ? ` --refresh ${refresh}` : ""
            return {
                message: "Dashboard spec saved. Run this command to render it:",
                command: `freeclimb dashboard --spec "${tmpPath}"${refreshFlag}`,
                specPath: tmpPath,
            }
        }

        // PerCL generation (local, no API call)
        case "generate_percl": {
            rejectControlChars(args.pattern as string | undefined, "pattern")
            rejectControlChars(args.text as string | undefined, "text")
            validateUrl(args.actionUrl as string | undefined, "actionUrl")
            return generatePerclPattern(
                args.pattern as string,
                args.text as string | undefined,
                args.actionUrl as string | undefined,
                args.options as Record<string, unknown> | undefined,
            )
        }

        default: {
            throw new Error(`Unknown tool: ${name}`)
        }
    }
}

export async function startMcpServer(): Promise<void> {
    const server = new Server(
        {
            name: "freeclimb",
            version: CLI_VERSION,
        },
        {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
            },
        },
    )

    // List tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: Object.values(tools).map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            ...(UI_TOOLS.has(tool.name as ToolName)
                ? { _meta: { ui: { resourceUri: UI_TABLE_URI, visibility: ["model", "app"] } } }
                : {}),
        })),
    }))

    // Call tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const toolName = request.params.name as ToolName
            const toolResult = await handleToolCall(
                toolName,
                (request.params.arguments as Record<string, unknown>) || {},
            )
            const uiPayload = UI_TOOLS.has(toolName)
                ? buildUiPayload(toolName, toolResult)
                : undefined
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(toolResult, null, 2),
                    },
                ],
                ...(uiPayload ? { structuredContent: uiPayload } : {}),
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error)
            const details =
                error instanceof Error && "response" in error
                    ? (error as { response?: { data?: unknown } }).response?.data
                    : undefined
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                error: message,
                                details,
                            },
                            null,
                            2,
                        ),
                    },
                ],
                isError: true,
            }
        }
    })

    // List resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        const uiResources = [
            {
                uri: UI_TABLE_URI,
                name: "FreeClimb Table",
                description: "FreeClimb-themed interactive table for list results",
                mimeType: UI_TABLE_MIME,
                _meta: {
                    ui: {
                        prefersBorder: true,
                        csp: {
                            resourceDomains: [
                                "https://fonts.googleapis.com",
                                "https://fonts.gstatic.com",
                            ],
                        },
                    },
                },
            },
        ]

        const apiResources = [
            {
                uri: "freeclimb://account",
                name: "Account Info",
                description: "Current FreeClimb account information and status",
                mimeType: "application/json",
            },
            {
                uri: "freeclimb://numbers",
                name: "Phone Numbers",
                description: "All phone numbers owned by this account",
                mimeType: "application/json",
            },
            {
                uri: "freeclimb://applications",
                name: "Applications",
                description: "All applications configured in this account",
                mimeType: "application/json",
            },
        ]

        const skillResources = discoverSkillResources().map((s) => ({
            uri: s.uri,
            name: s.name,
            description: s.description,
            mimeType: "text/markdown",
        }))

        return { resources: [...uiResources, ...apiResources, ...skillResources] }
    })

    // Read resources
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params

        // Handle MCP Apps UI resource (no API call needed)
        if (uri === UI_TABLE_URI) {
            return {
                contents: [
                    {
                        uri: UI_TABLE_URI,
                        mimeType: UI_TABLE_MIME,
                        text: TABLE_HTML,
                        _meta: {
                            ui: {
                                prefersBorder: true,
                                csp: {
                                    resourceDomains: [
                                        "https://fonts.googleapis.com",
                                        "https://fonts.gstatic.com",
                                    ],
                                },
                            },
                        },
                    },
                ],
            }
        }

        // Handle skill resources (no API call needed)
        if (uri.startsWith("freeclimb://skills/")) {
            const skillResources = discoverSkillResources()
            const skill = skillResources.find((s) => s.uri === uri)
            if (!skill) {
                throw new Error(`Unknown skill resource: ${uri}`)
            }
            const content = readFileSync(skill.path, "utf-8")
            return {
                contents: [
                    {
                        uri,
                        mimeType: "text/markdown",
                        text: content,
                    },
                ],
            }
        }

        // Handle API resources
        const client = await createApiAxios()
        let data: unknown

        switch (uri) {
            case "freeclimb://account": {
                ;({ data } = await client.get(""))
                break
            }
            case "freeclimb://numbers": {
                ;({ data } = await client.get("/IncomingPhoneNumbers"))
                break
            }
            case "freeclimb://applications": {
                ;({ data } = await client.get("/Applications"))
                break
            }
            default: {
                throw new Error(`Unknown resource: ${uri}`)
            }
        }

        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        }
    })

    // List prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: [
            {
                name: "send-sms",
                description: "Guide through sending an SMS message via FreeClimb",
                arguments: [
                    { name: "to", description: "Destination phone number", required: true },
                    { name: "message", description: "Message text to send", required: true },
                ],
            },
            {
                name: "make-call",
                description: "Guide through making a phone call via FreeClimb",
                arguments: [
                    { name: "to", description: "Destination phone number", required: true },
                    {
                        name: "applicationId",
                        description: "Application to handle the call",
                        required: true,
                    },
                ],
            },
            {
                name: "diagnose",
                description:
                    "Run FreeClimb CLI diagnostics to check connectivity and authentication",
            },
            {
                name: "dashboard",
                description:
                    "Generate a custom terminal monitoring dashboard for FreeClimb resources",
                arguments: [
                    {
                        name: "focus",
                        description: "What to monitor: calls, queues, sms, or health",
                        required: false,
                    },
                ],
            },
        ],
    }))

    // Get prompts
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        switch (request.params.name) {
            case "send-sms": {
                return {
                    description: "Send an SMS message via FreeClimb",
                    messages: [
                        {
                            role: "user" as const,
                            content: {
                                type: "text" as const,
                                text: `Send an SMS to ${request.params.arguments?.to || "<number>"} with the message: "${request.params.arguments?.message || "<message>"}". First, use the list_numbers tool to find an available FreeClimb number to send from, then use send_sms.`,
                            },
                        },
                    ],
                }
            }
            case "make-call": {
                return {
                    description: "Make a phone call via FreeClimb",
                    messages: [
                        {
                            role: "user" as const,
                            content: {
                                type: "text" as const,
                                text: `Make a phone call to ${request.params.arguments?.to || "<number>"} using application ${request.params.arguments?.applicationId || "<appId>"}. First, use list_numbers to find an available FreeClimb number, then use make_call.`,
                            },
                        },
                    ],
                }
            }
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
                const focus = request.params.arguments?.focus || "general"
                const prompt = await getDashboardPromptLazy()
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
                throw new Error(`Unknown prompt: ${request.params.name}`)
            }
        }
    })

    // Connect via stdio transport
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

// Generate MCP config for claude_desktop_config.json
export function generateMcpConfig(): string {
    const config = {
        mcpServers: {
            freeclimb: {
                command: "freeclimb",
                args: ["mcp", "start"],
                env: {
                    FREECLIMB_ACCOUNT_ID: "<YOUR_ACCOUNT_ID>",
                    FREECLIMB_API_KEY: "<YOUR_API_KEY>",
                },
            },
        },
    }

    return JSON.stringify(config, null, 2)
}
