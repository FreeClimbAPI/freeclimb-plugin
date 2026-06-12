/**
 * MCP Tool Definitions for FreeClimb CLI
 *
 * These tools expose FreeClimb API functionality to AI agents via MCP protocol.
 */

/* eslint-disable camelcase */

// Tool definitions
export const tools = {
    // Call management
    make_call: {
        name: "make_call",
        description: "Make an outbound phone call from a FreeClimb number to a destination number",
        inputSchema: {
            type: "object" as const,
            properties: {
                to: {
                    type: "string",
                    description: "Destination phone number in E.164 format (e.g., +15551234567)",
                },
                from: {
                    type: "string",
                    description: "FreeClimb phone number to call from in E.164 format",
                },
                applicationId: {
                    type: "string",
                    description: "Application ID to handle the call",
                },
                timeout: {
                    type: "number",
                    description: "Call timeout in seconds (optional, default 30)",
                },
            },
            required: ["to", "from", "applicationId"],
        },
    },

    list_calls: {
        name: "list_calls",
        description: "List recent phone calls for the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                status: {
                    type: "string",
                    description:
                        "Filter by call status: queued, ringing, inProgress, canceled, completed, failed, busy, noAnswer",
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
            required: [],
        },
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
            required: ["callId"],
        },
    },

    // SMS management
    send_sms: {
        name: "send_sms",
        description: "Send an SMS message from a FreeClimb number",
        inputSchema: {
            type: "object" as const,
            properties: {
                to: {
                    type: "string",
                    description: "Destination phone number in E.164 format",
                },
                from: {
                    type: "string",
                    description: "FreeClimb phone number to send from in E.164 format",
                },
                text: {
                    type: "string",
                    description: "The SMS message text (max 160 characters for single SMS)",
                },
            },
            required: ["to", "from", "text"],
        },
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
            required: [],
        },
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
            required: ["messageId"],
        },
    },

    // Phone number management
    list_numbers: {
        name: "list_numbers",
        description: "List all phone numbers owned by the account",
        inputSchema: {
            type: "object" as const,
            properties: {},
            required: [],
        },
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
            required: ["phoneNumberId"],
        },
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
            required: [],
        },
    },

    // Application management
    list_applications: {
        name: "list_applications",
        description: "List all applications in the account",
        inputSchema: {
            type: "object" as const,
            properties: {},
            required: [],
        },
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
            required: ["applicationId"],
        },
    },

    // Account information
    get_account: {
        name: "get_account",
        description: "Get account information and current status",
        inputSchema: {
            type: "object" as const,
            properties: {},
            required: [],
        },
    },

    // Logs
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
            required: [],
        },
    },

    filter_logs: {
        name: "filter_logs",
        description: "Filter logs using PQL (FreeClimb Query Language)",
        inputSchema: {
            type: "object" as const,
            properties: {
                pql: {
                    type: "string",
                    description: 'PQL query string (e.g., "level = \\"ERROR\\"")',
                },
                maxItems: {
                    type: "number",
                    description: "Maximum number of log entries to return",
                },
            },
            required: ["pql"],
        },
    },

    // Recordings
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
            required: [],
        },
    },

    // Conferences
    list_conferences: {
        name: "list_conferences",
        description: "List all conferences in the account",
        inputSchema: {
            type: "object" as const,
            properties: {
                status: {
                    type: "string",
                    description: "Filter by conference status",
                    enum: ["empty", "populated", "inProgress", "terminated"],
                },
            },
            required: [],
        },
    },

    // Queues
    list_queues: {
        name: "list_queues",
        description: "List all call queues in the account",
        inputSchema: {
            type: "object" as const,
            properties: {},
            required: [],
        },
    },

    // Call update (hang up or redirect active calls)
    update_call: {
        name: "update_call",
        description:
            "Update an active call — hang up or redirect to a new URL. Use to end calls or change call flow mid-call.",
        inputSchema: {
            type: "object" as const,
            properties: {
                callId: {
                    type: "string",
                    description: "The call ID to update",
                },
                status: {
                    type: "string",
                    description: "Set to 'completed' to hang up the call",
                    enum: ["completed", "canceled"],
                },
            },
            required: ["callId", "status"],
        },
    },

    // Dashboard generation
    generate_dashboard_prompt: {
        name: "generate_dashboard_prompt",
        description:
            "Get the component catalog and system prompt for generating terminal dashboard JSON specs. Returns instructions describing all available UI components, their schemas, and FreeClimb data bindings. Use this before generating a dashboard spec to understand what components you can use.",
        inputSchema: {
            type: "object" as const,
            properties: {
                preset: {
                    type: "string",
                    description:
                        "Optionally include a preset dashboard spec as a starting point",
                    enum: ["calls", "queues", "sms", "health"],
                },
            },
            required: [],
        },
    },

    render_dashboard: {
        name: "render_dashboard",
        description:
            "Save a JSON dashboard spec and return the CLI command to render it. The spec must conform to the json-render format with FreeClimb data source bindings.",
        inputSchema: {
            type: "object" as const,
            properties: {
                spec: {
                    type: "object",
                    description: "The json-render dashboard spec to render",
                },
                refresh: {
                    type: "number",
                    description: "Polling interval in seconds (default: 30)",
                },
            },
            required: ["spec"],
        },
    },

    // PerCL generation
    generate_percl: {
        name: "generate_percl",
        description:
            "Generate valid PerCL JSON for common call flow patterns. Returns a PerCL command array ready to use in webhook responses.",
        inputSchema: {
            type: "object" as const,
            properties: {
                pattern: {
                    type: "string",
                    description: "The call flow pattern to generate",
                    enum: ["greeting", "menu", "voicemail", "transfer", "queue", "record"],
                },
                text: {
                    type: "string",
                    description:
                        "Text for Say commands (greeting text, menu prompt, voicemail greeting)",
                },
                actionUrl: {
                    type: "string",
                    description:
                        "Webhook URL for callbacks (menu selection handler, recording handler, etc.)",
                },
                options: {
                    type: "object",
                    description:
                        "Pattern-specific options: { destination, callingNumber, queueId, waitUrl, maxDigits, finishOnKey, maxLengthSec }",
                },
            },
            required: ["pattern"],
        },
    },
}

export type ToolName = keyof typeof tools
