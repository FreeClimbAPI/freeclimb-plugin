import chalk from "chalk"
import { isAgentMode } from "./agent-config.js"

const { red, yellow, cyan, dim, bold } = chalk

interface ErrorSuggestion {
    docUrl?: string
    message: string
    tryCommands?: string[]
}

const errorSuggestions = new Map<number, ErrorSuggestion>()

// Authentication errors
errorSuggestions.set(0, {
    message: "Service inaccessible or credentials invalid",
    tryCommands: ["freeclimb login", "freeclimb diagnose"],
    docUrl: "https://docs.freeclimb.com/docs/authentication",
})

errorSuggestions.set(50, {
    message: "Login credentials may be incorrect",
    tryCommands: ["freeclimb login", "freeclimb diagnose"],
    docUrl: "https://docs.freeclimb.com/docs/authentication",
})

errorSuggestions.set(51, {
    message: "Account credentials expired or invalid",
    tryCommands: ["freeclimb login"],
    docUrl: "https://docs.freeclimb.com/docs/authentication",
})

// Input validation errors
errorSuggestions.set(1, {
    message: "Check for typos or misspelling in your command",
    tryCommands: ["freeclimb --help"],
})

errorSuggestions.set(3, {
    message: "Check that all flags and arguments are formatted correctly",
    tryCommands: ["freeclimb [command] --help"],
})

errorSuggestions.set(5, {
    message: "PQL query syntax error",
    docUrl: "https://docs.freeclimb.com/reference/logs#filter-logs",
})

errorSuggestions.set(9, {
    message: "Phone numbers must be in E.164 format",
    tryCommands: ["Example: +12223334444"],
})

// Number-related errors
errorSuggestions.set(10, {
    message: "This number is not SMS-enabled",
    tryCommands: [
        "freeclimb incoming-numbers:list",
        "freeclimb available-numbers:list --smsEnabled true",
    ],
})

errorSuggestions.set(11, {
    message: "International numbers require account upgrade",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(29, {
    message: "Outbound number not verified",
    tryCommands: ["freeclimb incoming-numbers:list"],
    docUrl: "https://freeclimb.com/dashboard",
})

errorSuggestions.set(46, {
    message: "Number not found or not owned by your account",
    tryCommands: ["freeclimb incoming-numbers:list"],
})

errorSuggestions.set(47, {
    message: "International access requires account upgrade",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(76, {
    message: "Number limit reached for trial account",
    tryCommands: ["freeclimb incoming-numbers:list"],
    docUrl: "https://freeclimb.com/pricing",
})

// Call/Conference errors
errorSuggestions.set(15, {
    message: "Failed to create calling number (internal error)",
    tryCommands: ["Retry the command"],
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(16, {
    message: "Failed to create call (internal error)",
    tryCommands: ["freeclimb diagnose", "Retry the command"],
})

errorSuggestions.set(17, {
    message: "Failed to update call (internal error)",
    tryCommands: ["freeclimb calls:get <callId>", "Retry the command"],
})

errorSuggestions.set(56, {
    message: "Call is currently in a conference",
    tryCommands: ["freeclimb conferences:list", "Wait for conference to end"],
})

errorSuggestions.set(66, {
    message: "Conference or call ID not found",
    tryCommands: ["freeclimb conferences:list", "freeclimb calls:list"],
})

// Queue errors
errorSuggestions.set(59, {
    message: "Failed to create queue (internal error)",
    tryCommands: ["freeclimb call-queues:list", "Retry the command"],
})

errorSuggestions.set(67, {
    message: "Failed to add member to queue (internal error)",
    tryCommands: ["freeclimb queue-members:list <queueId>"],
})

// Recording errors
errorSuggestions.set(68, {
    message: "Recording not found",
    tryCommands: ["freeclimb recordings:list"],
})

errorSuggestions.set(69, {
    message: "Recording file URL returned empty response",
    tryCommands: ["freeclimb recordings:get <recordingId>"],
})

// Account errors
errorSuggestions.set(6, {
    message: "Account profile incomplete",
    docUrl: "https://freeclimb.com/dashboard/portal/account/profile",
})

errorSuggestions.set(27, {
    message: "Trial account features conflict with upgraded account",
    docUrl: "https://freeclimb.com/dashboard",
})

errorSuggestions.set(43, {
    message: "Account type not recognized (internal error)",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(44, {
    message: "Account status not recognized (internal error)",
    docUrl: "https://support.freeclimb.com",
})

// Rate limiting
errorSuggestions.set(24, {
    message: "Rate limit exceeded",
    tryCommands: ["Wait a moment and retry"],
})

// Server errors
errorSuggestions.set(55, {
    message: "Server temporarily unavailable",
    tryCommands: ["freeclimb diagnose", "Retry in a few minutes"],
})

// Resource errors
errorSuggestions.set(61, {
    message: "Resource ID conflict (internal error)",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(62, {
    message: "Failed to create conference (internal error)",
    tryCommands: ["freeclimb conferences:list"],
})

errorSuggestions.set(77, {
    message: "Resource has been deleted",
    tryCommands: ["Resource no longer available"],
})

// Generic
errorSuggestions.set(18, {
    message: "Failed to update conference participant (internal error)",
    tryCommands: ["freeclimb conference-participants:list <conferenceId>"],
})

errorSuggestions.set(19, {
    message: "Failed to hang up participant (internal error)",
})

errorSuggestions.set(20, {
    message: "Failed to remove participant from conference (internal error)",
    tryCommands: ["freeclimb conference-participants:list <conferenceId>"],
})

errorSuggestions.set(30, {
    message: "Contact support for assistance",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(31, {
    message: "Unexpected error occurred",
    docUrl: "https://support.freeclimb.com",
})

errorSuggestions.set(49, {
    message: "Contact support for assistance",
    docUrl: "https://support.freeclimb.com",
})

export function errorWithSuggestions(errorM: any): string {
    const errorInfo = errorSuggestions.get(errorM.code)
    const suggestion = errorInfo?.message || "Refer to documentation"
    const tryCommands = errorInfo?.tryCommands || []
    const docUrl = errorInfo?.docUrl || errorM.url

    return formatEnhancedError(errorM.code, errorM.message, suggestion, tryCommands, docUrl)
}

export function returnFormat(
    code: number,
    message: string,
    url: string,
    suggestion: string,
): string {
    return formatEnhancedError(code, message, suggestion, [], url)
}

function formatEnhancedError(
    code: number,
    message: string,
    suggestion: string,
    tryCommands: string[],
    docUrl?: string,
): string {
    if (isAgentMode()) {
        return JSON.stringify(
            {
                error: true,
                code,
                message,
                suggestion,
                tryCommands: tryCommands.length > 0 ? tryCommands : undefined,
                docUrl: docUrl || undefined,
            },
            null,
            2,
        )
    }

    const lines: string[] = []

    lines.push("")
    lines.push(red(`Error: ${message}`))
    lines.push("")
    lines.push(`${bold("Code:")} ${code}`)
    lines.push(`${bold("Suggestion:")} ${suggestion}`)

    if (tryCommands.length > 0) {
        lines.push("")
        lines.push(yellow("Try:"))
        tryCommands.forEach((cmd, i) => {
            if (cmd.startsWith("freeclimb")) {
                lines.push(`  ${i + 1}. ${cyan(cmd)}`)
            } else {
                lines.push(`  ${i + 1}. ${cmd}`)
            }
        })
    }

    if (docUrl) {
        lines.push("")
        lines.push(dim(`Need help? ${docUrl}`))
    }

    lines.push("")

    return lines.join("\n")
}
