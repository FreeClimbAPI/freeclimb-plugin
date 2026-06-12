import chalk from "chalk"

// FreeClimb brand colors from website
export const BrandColors = {
    // Primary brand colors (hex values)
    darkTeal: "#004e63", // Primary dark teal
    lightTeal: "#26697a", // Secondary lighter teal
    orange: "#fa660a", // Accent orange
    lime: "#c2ff18", // Highlight lime/green
} as const

// Detect if we should use colors
export function supportsColor(): boolean {
    // Respect NO_COLOR environment variable
    if (process.env.NO_COLOR !== undefined) {
        return false
    }
    // Check if chalk thinks we support color
    return Boolean(chalk.supportsColor)
}

// Detect if output is a TTY (interactive terminal)
export function isTTY(): boolean {
    return Boolean(process.stdout.isTTY)
}

// Create chalk instances for brand colors
const createBrandChalk = () => {
    if (!supportsColor()) {
        return {
            primary: chalk,
            secondary: chalk,
            accent: chalk,
            highlight: chalk,
            success: chalk,
            warning: chalk,
            error: chalk,
            info: chalk,
            dim: chalk,
        }
    }

    return {
        // Primary brand colors
        primary: chalk.hex(BrandColors.lightTeal), // Light teal - main headers
        secondary: chalk.hex(BrandColors.lightTeal), // Light teal - secondary elements
        accent: chalk.hex(BrandColors.lightTeal), // Light teal - command highlights
        highlight: chalk.hex(BrandColors.lime), // Lime - success, highlights

        // Semantic colors (using brand palette)
        success: chalk.hex("#3fb950"), // Green (semantic success)
        warning: chalk.hex(BrandColors.orange), // Orange (brand)
        error: chalk.red, // Red for errors
        info: chalk.hex(BrandColors.lightTeal), // Light teal for info
        dim: chalk.dim, // Standard dim
    }
}

export const theme = createBrandChalk()

// Typography helpers
export const typography = {
    // Headers
    h1: (text: string): string => {
        if (!supportsColor()) return text.toUpperCase()
        return chalk.hex(BrandColors.lightTeal).bold(text)
    },

    h2: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.bold(text)
    },

    // Labels and values for key-value pairs
    label: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.bold(text)
    },

    value: (text: string): string => text,

    // Command styling (for showing CLI commands)
    command: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.hex(BrandColors.lightTeal)(text)
    },

    // Dimmed text for hints and secondary info
    hint: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.dim(text)
    },

    // Success message
    success: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.hex("#3fb950")(text)
    },

    // Warning message
    warning: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.hex(BrandColors.orange)(text)
    },

    // Error message
    error: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.red(text)
    },

    // Link styling
    link: (text: string): string => {
        if (!supportsColor()) return text
        return chalk.underline(text)
    },

    // Code/technical text
    code: (text: string): string => {
        if (!supportsColor()) return `\`${text}\``
        return chalk.cyan(text)
    },
}

// Get terminal width, with fallback
export function getTerminalWidth(): number {
    return process.stdout.columns || 80
}

// Pad string to center within a given width
export function centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2))
    return " ".repeat(padding) + text
}

// Truncate text with ellipsis if too long
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    if (maxLength <= 1) return "\u2026"
    return text.slice(0, maxLength - 1) + "\u2026"
}
