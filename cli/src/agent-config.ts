import { Environment } from "./environment.js"
import { isTTY } from "./ui/theme.js"

export type OutputFormat = "human" | "json" | "raw"

export function getOutputFormat(flagJson?: boolean, flagRaw?: boolean): OutputFormat {
    if (flagRaw) return "raw"
    if (flagJson) return "json"

    const envFormat = Environment.getString("FREECLIMB_OUTPUT_FORMAT").toLowerCase()
    if (envFormat === "json") return "json"
    if (envFormat === "raw") return "raw"

    return "human"
}

export function shouldUseColor(): boolean {
    if (!isTTY()) return false
    if (process.env.NO_COLOR !== undefined) return false
    return true
}

export function isAgentMode(): boolean {
    return Environment.getString("FREECLIMB_OUTPUT_FORMAT") !== ""
}
