import chalk from "chalk"
import { getErrorSuggestion, isAgentMode } from "@freeclimb/core"

const { red, yellow, cyan, dim, bold } = chalk

export function errorWithSuggestions(errorM: any): string {
    const errorInfo = getErrorSuggestion(errorM.code)
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

    const lines: string[] = [
        "",
        red(`Error: ${message}`),
        "",
        `${bold("Code:")} ${code}`,
        `${bold("Suggestion:")} ${suggestion}`,
    ]

    if (tryCommands.length > 0) {
        lines.push("", yellow("Try:"))
        tryCommands.forEach((cmd, i) => {
            if (cmd.startsWith("freeclimb")) {
                lines.push(`  ${i + 1}. ${cyan(cmd)}`)
            } else {
                lines.push(`  ${i + 1}. ${cmd}`)
            }
        })
    }

    if (docUrl) {
        lines.push("", dim(`Need help? ${docUrl}`))
    }

    lines.push("")

    return lines.join("\n")
}
