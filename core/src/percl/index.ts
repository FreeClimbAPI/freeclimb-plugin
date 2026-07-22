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
    "TranscribeUtterance",
    "Enqueue",
    "Dequeue",
    "AddToConference",
    "CreateConference",
    "TerminateConference",
    "RemoveFromConference",
    "SetListen",
    "SetTalk",
    "SetDTMFPassThrough",
    "Reject",
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
    "ifMachineUrl",
    "callControlUrl",
    "file",
    "grammarFile",
])

type PerclParameterType = "array" | "boolean" | "number" | "string"

const REQUIRED_FIELDS: Readonly<Record<string, readonly string[]>> = {
    Say: ["text"],
    Play: ["file"],
    PlayEarlyMedia: ["file"],
    Pause: ["length"],
    GetDigits: ["actionUrl"],
    GetSpeech: ["actionUrl", "grammarFile"],
    Redirect: ["actionUrl"],
    SendDigits: ["digits"],
    OutDial: ["destination", "callingNumber", "actionUrl", "callConnectUrl"],
    Sms: ["to", "from", "text"],
    RecordUtterance: ["actionUrl"],
    Enqueue: ["queueId", "waitUrl", "actionUrl"],
    AddToConference: ["conferenceId"],
    CreateConference: ["actionUrl"],
    SetListen: ["listen"],
    SetTalk: ["talk"],
    SetDTMFPassThrough: ["dtmfPassThrough"],
}

const PARAMETER_TYPES: Readonly<Record<string, Readonly<Record<string, PerclParameterType>>>> = {
    Say: { text: "string", language: "string", loop: "number", privacyMode: "boolean" },
    Play: { file: "string", loop: "number", privacyMode: "boolean" },
    PlayEarlyMedia: { file: "string", loop: "number" },
    Pause: { length: "number" },
    GetDigits: {
        actionUrl: "string",
        prompts: "array",
        maxDigits: "number",
        minDigits: "number",
        initialTimeoutMs: "number",
        digitTimeoutMs: "number",
        finishOnKey: "string",
        flushBuffer: "boolean",
        privacyMode: "boolean",
    },
    GetSpeech: {
        actionUrl: "string",
        grammarFile: "string",
        grammarRule: "string",
        prompts: "array",
        playBeep: "boolean",
        privacyMode: "boolean",
    },
    Redirect: { actionUrl: "string" },
    SendDigits: { digits: "string", pauseMs: "number", privacyMode: "boolean" },
    OutDial: {
        destination: "string",
        callingNumber: "string",
        actionUrl: "string",
        callConnectUrl: "string",
        timeout: "number",
        privacyMode: "boolean",
    },
    Sms: { to: "string", from: "string", text: "string" },
    RecordUtterance: {
        actionUrl: "string",
        silenceTimeoutMs: "number",
        maxLengthSec: "number",
        finishOnKey: "string",
        playBeep: "boolean",
    },
    Enqueue: { queueId: "string", waitUrl: "string", actionUrl: "string" },
    AddToConference: {
        conferenceId: "string",
        startConfOnEnter: "boolean",
        talk: "boolean",
        listen: "boolean",
        leaveConferenceUrl: "string",
        notificationUrl: "string",
        allowCallControl: "boolean",
        callControlSequence: "string",
        callControlUrl: "string",
    },
    CreateConference: {
        actionUrl: "string",
        alias: "string",
        record: "boolean",
        statusCallbackUrl: "string",
    },
    SetListen: { listen: "boolean" },
    SetTalk: { talk: "boolean" },
    SetDTMFPassThrough: { dtmfPassThrough: "boolean" },
}

export interface PerclValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

function isHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "https:"
    } catch {
        return false
    }
}

function isNonPublicHost(value: string): boolean {
    try {
        const url = new URL(value)
        const hostname = url.hostname.toLowerCase()
        if (
            hostname === "localhost" ||
            hostname === "0.0.0.0" ||
            hostname === "[::1]" ||
            hostname.endsWith(".local")
        ) {
            return true
        }
        const octets = hostname.split(".").map(Number)
        if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet))) {
            return (
                octets[0] === 10 ||
                octets[0] === 127 ||
                (octets[0] === 169 && octets[1] === 254) ||
                (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
                (octets[0] === 192 && octets[1] === 168)
            )
        }
        return (
            hostname.startsWith("[fc") ||
            hostname.startsWith("[fd") ||
            hostname.startsWith("[fe80:")
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
        if (URL_FIELDS.has(key)) {
            if (
                typeof value !== "string" ||
                value.length === 0 ||
                !isHttpsUrl(value) ||
                isNonPublicHost(value)
            ) {
                result.errors.push(
                    `${path}.${commandName}.${key} must be a public HTTPS URL (got ${JSON.stringify(value)}).`,
                )
            }
        }
        if (key === "prompts" && Array.isArray(value)) {
            validatePerclArray(value, `${path}.${commandName}.prompts`, result)
        }
    }
}

function matchesParameterType(value: unknown, type: PerclParameterType): boolean {
    switch (type) {
        case "array":
            return Array.isArray(value)
        case "boolean":
            return typeof value === "boolean"
        case "number":
            return typeof value === "number" && Number.isFinite(value)
        case "string":
            return typeof value === "string"
        default: {
            const exhaustive: never = type
            return exhaustive
        }
    }
}

function validateCommandParameters(
    commandName: string,
    params: Record<string, unknown>,
    path: string,
    result: PerclValidationResult,
): void {
    for (const field of REQUIRED_FIELDS[commandName] ?? []) {
        const value = params[field]
        if (value === undefined || value === null || value === "") {
            result.errors.push(`${path}.${commandName}.${field} is required.`)
        }
    }

    const parameterTypes = PARAMETER_TYPES[commandName] ?? {}
    for (const [field, value] of Object.entries(params)) {
        const expectedType = parameterTypes[field]
        if (expectedType && !matchesParameterType(value, expectedType)) {
            result.errors.push(`${path}.${commandName}.${field} must be a ${expectedType}.`)
        }
    }

    validateCommandUrls(commandName, params, path, result)
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
        validateCommandParameters(commandName, params as Record<string, unknown>, entryPath, result)
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
