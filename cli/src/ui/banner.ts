import chalk from "chalk"
import { BrandColors, supportsColor, typography } from "./theme.js"
import { icons } from "./chars.js"

// FreeClimb brand colors for banner
const darkTeal = supportsColor() ? chalk.hex(BrandColors.darkTeal) : chalk
const lightTeal = supportsColor() ? chalk.hex(BrandColors.lightTeal) : chalk
const highlight = supportsColor() ? chalk.hex(BrandColors.lime) : chalk
const { dim } = chalk

// ASCII banner - FREECLIMB in clean, uniform block letters
const bannerLines = [
    " ███████╗██████╗ ███████╗███████╗ ██████╗██╗     ██╗███╗   ███╗██████╗ ",
    " ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██║     ██║████╗ ████║██╔══██╗",
    " █████╗  ██████╔╝█████╗  █████╗  ██║     ██║     ██║██╔████╔██║██████╔╝",
    " ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║     ██║     ██║██║╚██╔╝██║██╔══██╗",
    " ██║     ██║  ██║███████╗███████╗╚██████╗███████╗██║██║ ╚═╝ ██║██████╔╝",
    " ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚══════╝╚═╝╚═╝     ╚═╝╚═════╝ ",
]

export const ASCII_BANNER = supportsColor()
    ? "\n" + bannerLines.map((line) => darkTeal(line)).join("\n") + "\n"
    : `
 ███████╗██████╗ ███████╗███████╗ ██████╗██╗     ██╗███╗   ███╗██████╗
 ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██║     ██║████╗ ████║██╔══██╗
 █████╗  ██████╔╝█████╗  █████╗  ██║     ██║     ██║██╔████╔██║██████╔╝
 ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║     ██║     ██║██║╚██╔╝██║██╔══██╗
 ██║     ██║  ██║███████╗███████╗╚██████╗███████╗██║██║ ╚═╝ ██║██████╔╝
 ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚══════╝╚═╝╚═╝     ╚═╝╚═════╝
`

export const TAGLINE = supportsColor()
    ? dim("  The communications CLI for ") +
      highlight("developers") +
      dim(" and ") +
      highlight("agents")
    : "  The communications CLI for developers and agents"

export function getWelcomeBanner(): string {
    // Command names in light teal (secondary, readable, not punchy)
    const cmdStyle = supportsColor() ? lightTeal : (s: string) => s
    // $ prompt in light teal (subtle, not distracting)
    const promptStyle = supportsColor() ? lightTeal : (s: string) => s
    // Subcommands and descriptions in dim gray
    const hintStyle = dim

    const lines = [
        ASCII_BANNER,
        TAGLINE,
        "",
        `  ${promptStyle("$")} ${cmdStyle("freeclimb calls")} ${hintStyle("make | list | get")}      ${hintStyle("Make and manage calls")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb sms")} ${hintStyle("send | list | get")}        ${hintStyle("Send and manage SMS")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb applications")} ${hintStyle("list | create")}   ${hintStyle("Manage applications")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb incoming-numbers")} ${hintStyle("buy | list")}  ${hintStyle("Manage phone numbers")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb logs")} ${hintStyle("list | filter")}           ${hintStyle("View account logs")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb mcp")} ${hintStyle("start | config")}           ${hintStyle("AI agent integration")}`,
        `  ${promptStyle("$")} ${cmdStyle("freeclimb api")} ${hintStyle("<endpoint>")}               ${hintStyle("Authenticated API request")}`,
        "",
        `  ${highlight("try:")} ${highlight("freeclimb calls:list --json")}`,
        "",
        `  ${lightTeal("Learn more")} ${hintStyle("at")} ${chalk.underline("https://docs.freeclimb.com/docs/freeclimb-cli-quickstart")}`,
        "",
    ]
    return lines.join("\n")
}

export function getSuccessMessage(message: string): string {
    return `${icons.success()} ${message}`
}

export function getErrorMessage(message: string): string {
    return `${icons.error()} ${supportsColor() ? chalk.red(message) : message}`
}

export function getWarningMessage(message: string): string {
    return `${icons.warning()} ${message}`
}

export function getInfoMessage(message: string): string {
    return `${icons.info()} ${message}`
}

export function formatCommandHelp(command: string, description: string): string {
    // Command names in light teal (secondary, readable)
    const cmdStyle = supportsColor() ? lightTeal : (s: string) => s
    return `  ${cmdStyle(command.padEnd(40))} ${dim(description)}`
}

// Compact banner for use in command outputs
export function getCompactBanner(): string {
    const brandStyle = supportsColor() ? darkTeal : (s: string) => s
    return brandStyle("FreeClimb CLI")
}
