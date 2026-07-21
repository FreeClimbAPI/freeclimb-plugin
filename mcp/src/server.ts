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
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { tools, type ToolName } from "./tools.js"
import { UI_TABLE_URI, UI_TABLE_MIME, UI_TOOLS, TABLE_HTML, buildUiPayload } from "./ui.js"
import {
    DASHBOARD_HTML,
    UI_DASHBOARD_MIME,
    UI_DASHBOARD_URI,
    type DashboardPayload,
} from "./dashboard-ui.js"
import { dispatchTool } from "./handlers.js"
import { listFreeclimbResources, readFreeclimbResource } from "./resources.js"
import { promptDefinitions, getPrompt } from "./prompts.js"

const currentDir = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(currentDir, "../package.json")
const { version: MCP_VERSION } = JSON.parse(readFileSync(pkgPath, "utf-8"))

export function getUiResourceUri(toolName: ToolName): string | undefined {
    if (toolName === "render_dashboard") return UI_DASHBOARD_URI
    if (UI_TOOLS.has(toolName)) return UI_TABLE_URI
    return undefined
}

export async function startMcpServer(): Promise<void> {
    const server = new Server(
        {
            name: "freeclimb",
            version: MCP_VERSION,
        },
        {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
            },
        },
    )

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: Object.values(tools).map((tool) => {
            const resourceUri = getUiResourceUri(tool.name as ToolName)
            return {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                ...(resourceUri
                    ? { _meta: { ui: { resourceUri, visibility: ["model", "app"] } } }
                    : {}),
            }
        }),
    }))

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const toolName = request.params.name as ToolName
            const toolResult = await dispatchTool(
                toolName,
                (request.params.arguments as Record<string, unknown>) || {},
            )
            const uiPayload =
                toolName === "render_dashboard"
                    ? {
                          dashboard: (toolResult as { dashboard: DashboardPayload }).dashboard,
                      }
                    : UI_TOOLS.has(toolName)
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
            {
                uri: UI_DASHBOARD_URI,
                name: "FreeClimb Dashboard",
                description: "FreeClimb snapshot dashboard",
                mimeType: UI_DASHBOARD_MIME,
                _meta: {
                    ui: {
                        prefersBorder: false,
                        csp: {
                            resourceDomains: [],
                        },
                    },
                },
            },
        ]

        return { resources: [...uiResources, ...listFreeclimbResources()] }
    })

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params

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

        if (uri === UI_DASHBOARD_URI) {
            return {
                contents: [
                    {
                        uri: UI_DASHBOARD_URI,
                        mimeType: UI_DASHBOARD_MIME,
                        text: DASHBOARD_HTML,
                        _meta: {
                            ui: {
                                prefersBorder: false,
                                csp: {
                                    resourceDomains: [],
                                },
                            },
                        },
                    },
                ],
            }
        }

        const resource = await readFreeclimbResource(uri)
        return { contents: [resource] }
    })

    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: promptDefinitions,
    }))

    server.setRequestHandler(GetPromptRequestSchema, async (request) =>
        getPrompt(request.params.name, request.params.arguments),
    )

    const transport = new StdioServerTransport()
    await server.connect(transport)
}

// Generate MCP config for an MCP client (e.g. Cursor's .mcp.json).
// v1 launches the locally-built standalone server over stdio from the synced
// plugin repo — no global CLI install and no npm registry fetch. The path is
// plugin-relative (a plugin-spawned MCP server runs with cwd = plugin root).
// Credentials live in the OS keyring (run `node mcp/lib/bin.js login`), so no
// env block is emitted.
export function generateMcpConfig(): string {
    const config = {
        mcpServers: {
            freeclimb: {
                command: "node",
                args: ["mcp/lib/bin.js"],
            },
        },
    }

    return JSON.stringify(config, null, 2)
}
