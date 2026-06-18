export const PERCL_COMMANDS = [
    "Say",
    "Play",
    "PlayEarlyMedia",
    "Pause",
    "GetDigits",
    "GetSpeech",
    "Redirect",
    "Hangup",
    "SendDigits",
    "OutDial",
    "Sms",
    "RecordUtterance",
    "StartRecordCall",
    "StopRecordCall",
    "Enqueue",
    "Dequeue",
    "AddToConference",
    "CreateConference",
    "TerminateConference",
    "RemoveFromConference",
    "SetListen",
    "SetTalk",
    "Reject",
    "Park",
    "Unpark",
] as const

export type PerclCommandName = (typeof PERCL_COMMANDS)[number]

const COMMAND_SET: ReadonlySet<string> = new Set(PERCL_COMMANDS)

// Fields whose value must be an absolute, publicly reachable URL.
const URL_FIELDS: ReadonlySet<string> = new Set([
    "actionUrl",
    "callConnectUrl",
    "waitUrl",
    "notificationUrl",
    "statusCallbackUrl",
    "leaveConferenceUrl",
    "file",
])

export interface PerclValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

function isAbsoluteHttpUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

function isLocalHost(value: string): boolean {
    try {
        const url = new URL(value)
        return (
            url.hostname === "localhost" ||
            url.hostname === "127.0.0.1" ||
            url.hostname === "0.0.0.0" ||
            url.hostname.endsWith(".local")
        )
    } catch {
        return false
    }
}

function validateCommandUrls(
    commandName: string,
    params: Record<string, unknown>,
    path: string,
    result: PerclValidationResult,
): void {
    for (const [key, value] of Object.entries(params)) {
        if (URL_FIELDS.has(key) && typeof value === "string" && value.length > 0) {
            if (!isAbsoluteHttpUrl(value)) {
                result.errors.push(
                    `${path}.${commandName}.${key} must be an absolute http(s) URL (got "${value}"). FreeClimb rejects relative paths.`,
                )
            } else if (isLocalHost(value)) {
                result.warnings.push(
                    `${path}.${commandName}.${key} points at localhost ("${value}"). FreeClimb cannot reach localhost; use a public tunnel/deploy URL.`,
                )
            }
        }
        // Recurse into nested PerCL (e.g. GetDigits.prompts is an array of commands).
        if (key === "prompts" && Array.isArray(value)) {
            validatePerclArray(value, `${path}.${commandName}.prompts`, result)
        }
    }
}

function validatePerclArray(input: unknown, path: string, result: PerclValidationResult): void {
    if (!Array.isArray(input)) {
        result.errors.push(`${path} must be a JSON array of PerCL command objects.`)
        return
    }
    input.forEach((entry, index) => {
        const entryPath = `${path}[${index}]`
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
            result.errors.push(`${entryPath} must be an object with a single command key.`)
            return
        }
        const keys = Object.keys(entry as Record<string, unknown>)
        if (keys.length !== 1) {
            result.errors.push(
                `${entryPath} must have exactly one command key; found ${keys.length} (${keys.join(", ")}).`,
            )
            return
        }
        const [commandName] = keys
        if (!COMMAND_SET.has(commandName)) {
            result.errors.push(
                `${entryPath} uses unknown PerCL command "${commandName}". Known commands: ${PERCL_COMMANDS.join(", ")}.`,
            )
            return
        }
        const params = (entry as Record<string, unknown>)[commandName]
        if (typeof params !== "object" || params === null || Array.isArray(params)) {
            result.errors.push(`${entryPath}.${commandName} must be an object of parameters.`)
            return
        }
        validateCommandUrls(commandName, params as Record<string, unknown>, entryPath, result)
    })
}

export function validatePercl(input: unknown): PerclValidationResult {
    const result: PerclValidationResult = { valid: true, errors: [], warnings: [] }
    validatePerclArray(input, "percl", result)
    result.valid = result.errors.length === 0
    return result
}

export type PerclPattern =
    | "greeting"
    | "menu"
    | "voicemail"
    | "transfer"
    | "queue"
    | "record"
    | "play"
    | "speech"
    | "conference"

export interface PerclPatternOptions {
    destination?: string
    callingNumber?: string
    callConnectUrl?: string
    queueId?: string
    conferenceId?: string
    waitUrl?: string
    file?: string
    grammarFile?: string
    maxDigits?: number
    finishOnKey?: string
    maxLengthSec?: number
    pauseMs?: number
}

export function generatePercl(
    pattern: PerclPattern,
    text?: string,
    actionUrl?: string,
    options?: PerclPatternOptions,
): unknown[] {
    switch (pattern) {
        case "greeting":
            return [{ Say: { text: text || "Thank you for calling. Goodbye." } }, { Hangup: {} }]

        case "menu":
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
                        maxDigits: options?.maxDigits || 1,
                        minDigits: 1,
                        initialTimeoutMs: 8000,
                        flushBuffer: true,
                    },
                },
            ]

        case "voicemail":
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
                        maxLengthSec: options?.maxLengthSec || 120,
                        finishOnKey: options?.finishOnKey || "#",
                        playBeep: true,
                    },
                },
            ]

        case "transfer":
            return [
                { Say: { text: text || "Transferring your call. Please hold." } },
                {
                    OutDial: {
                        destination: options?.destination || "+15551234567",
                        callingNumber: options?.callingNumber || "+15559876543",
                        actionUrl: actionUrl || "https://example.com/transfer-status",
                        callConnectUrl:
                            options?.callConnectUrl || "https://example.com/connected",
                        timeout: 30,
                    },
                },
            ]

        case "queue":
            return [
                { Say: { text: text || "Please hold while we connect you with an agent." } },
                {
                    Enqueue: {
                        queueId: options?.queueId || "QU...",
                        waitUrl: options?.waitUrl || "https://example.com/hold-music",
                        actionUrl: actionUrl || "https://example.com/dequeued",
                    },
                },
            ]

        case "record":
            return [
                {
                    Say: {
                        text: text || "This call may be recorded for quality and training purposes.",
                    },
                },
                { StartRecordCall: {} },
            ]

        case "play":
            return [
                {
                    Play: {
                        file: options?.file || "https://example.com/audio.wav",
                    },
                },
            ]

        case "speech":
            return [
                {
                    GetSpeech: {
                        actionUrl: actionUrl || "https://example.com/speech-handler",
                        grammarFile: options?.grammarFile || "https://example.com/grammar.grxml",
                        prompts: [
                            { Say: { text: text || "Please say what you are calling about." } },
                        ],
                    },
                },
            ]

        case "conference":
            return [
                { Say: { text: text || "Connecting you to the conference now." } },
                {
                    CreateConference: {
                        actionUrl: actionUrl || "https://example.com/conference-status",
                        playBeep: "always",
                        record: false,
                    },
                },
            ]

        default: {
            const exhaustive: never = pattern
            throw new Error(`Unknown PerCL pattern: ${String(exhaustive)}`)
        }
    }
}

export const PERCL_PATTERNS: PerclPattern[] = [
    "greeting",
    "menu",
    "voicemail",
    "transfer",
    "queue",
    "record",
    "play",
    "speech",
    "conference",
]
