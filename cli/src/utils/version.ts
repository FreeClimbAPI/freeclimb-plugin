const { version } = require("../../package.json")

export const CLI_VERSION: string = version

export function isNewer(latest: string, current: string): boolean {
    const latestParts = latest.split(".").map(Number)
    const currentParts = current.split(".").map(Number)

    for (let i = 0; i < 3; i++) {
        const l = latestParts[i] || 0
        const c = currentParts[i] || 0
        if (l > c) return true
        if (l < c) return false
    }

    return false
}
