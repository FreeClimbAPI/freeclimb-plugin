import chalk from "chalk"
import { BrandColors, supportsColor, isTTY } from "./theme.js"

// Unicode box drawing characters (rounded corners)
export const box = {
    // Corners (rounded)
    topLeft: "\u256d",
    topRight: "\u256e",
    bottomLeft: "\u2570",
    bottomRight: "\u256f",

    // Straight lines
    horizontal: "\u2500",
    vertical: "\u2502",

    // T-junctions
    teeRight: "\u251c",
    teeLeft: "\u2524",
    teeDown: "\u252c",
    teeUp: "\u2534",

    // Cross
    cross: "\u253c",
} as const

// Simple ASCII fallback for non-TTY environments
export const boxAscii = {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    teeRight: "+",
    teeLeft: "+",
    teeDown: "+",
    teeUp: "+",
    cross: "+",
} as const

// Box character type for both unicode and ascii versions
export type BoxChars = {
    bottomLeft: string
    bottomRight: string
    cross: string
    horizontal: string
    teeDown: string
    teeLeft: string
    teeRight: string
    teeUp: string
    topLeft: string
    topRight: string
    vertical: string
}

// Get the appropriate box characters based on environment
export function getBoxChars(): BoxChars {
    if (!isTTY()) {
        return boxAscii
    }
    return box
}

// Status icons with colors
export const icons = {
    // Success/pass
    success: (): string => {
        const icon = "\u2714"
        if (!supportsColor()) return icon
        return chalk.hex("#3fb950")(icon)
    },

    // Error/fail
    error: (): string => {
        const icon = "\u2718"
        if (!supportsColor()) return icon
        return chalk.red(icon)
    },

    // Warning
    warning: (): string => {
        const icon = "\u26a0"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.orange)(icon)
    },

    // Info
    info: (): string => {
        const icon = "\u2139"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.lightTeal)(icon)
    },

    // Filled circle (active)
    active: (): string => {
        const icon = "\u25cf"
        if (!supportsColor()) return icon
        return chalk.hex("#3fb950")(icon)
    },

    // Empty circle (inactive)
    inactive: (): string => {
        const icon = "\u25cb"
        if (!supportsColor()) return icon
        return chalk.dim(icon)
    },

    // Pending/loading
    pending: (): string => {
        const icon = "\u231b"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.orange)(icon)
    },

    // Arrow right
    arrow: (): string => {
        const icon = "\u203a"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.lightTeal)(icon)
    },

    // Bullet point
    bullet: (): string => {
        const icon = "\u2022"
        if (!supportsColor()) return icon
        return chalk.dim(icon)
    },

    // Play/run indicator
    play: (): string => {
        const icon = "\u25b6"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.lime)(icon)
    },

    // Chevron right (for menus)
    chevron: (): string => {
        const icon = "\u203a"
        if (!supportsColor()) return icon
        return chalk.hex(BrandColors.lightTeal)(icon)
    },
} as const

// Separators
export const separators = {
    // Horizontal line
    line: (width: number): string => box.horizontal.repeat(width),

    // Dotted line
    dotted: (width: number): string => "\u00b7".repeat(width),

    // Light horizontal line
    light: (width: number): string => "\u2500".repeat(width),
} as const

// Draw a horizontal rule with optional title
export function horizontalRule(title?: string, width = 40): string {
    const chars = getBoxChars()

    if (!title) {
        return chars.horizontal.repeat(width)
    }

    const paddedTitle = ` ${title} `
    const remainingWidth = Math.max(0, width - paddedTitle.length - 2)
    const leftWidth = Math.floor(remainingWidth / 2)
    const rightWidth = remainingWidth - leftWidth

    const left = chars.horizontal.repeat(leftWidth)
    const right = chars.horizontal.repeat(rightWidth)

    if (!supportsColor()) {
        return `${chars.teeRight}${left}${paddedTitle}${right}${chars.teeLeft}`
    }

    return `${chars.teeRight}${left}${chalk.hex(BrandColors.lightTeal)(paddedTitle)}${right}${chars.teeLeft}`
}
