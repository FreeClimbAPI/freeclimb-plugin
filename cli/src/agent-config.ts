import { isTTY } from "./ui/theme.js"

export { getOutputFormat, isAgentMode } from "@freeclimb/core"
export type { OutputFormat } from "@freeclimb/core"

export function shouldUseColor(): boolean {
    if (!isTTY()) return false
    if (process.env.NO_COLOR !== undefined) return false
    return true
}
