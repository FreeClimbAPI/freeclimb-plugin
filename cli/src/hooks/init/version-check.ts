import { Hook } from "@oclif/core"
import axios from "axios"
import * as fs from "node:fs"
import * as path from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../../../package.json")
const { version: currentVersion } = JSON.parse(readFileSync(pkgPath, "utf-8"))

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

function isNewer(latest: string, current: string): boolean {
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

async function checkLatestVersion(cacheDir: string, cacheFile: string): Promise<void> {
    const response = await axios.get("https://registry.npmjs.org/freeclimb-cli/latest", {
        timeout: 5_000,
    })
    const { version: latestVersion } = response.data

    // Ensure cache directory exists
    fs.mkdirSync(cacheDir, { recursive: true })

    fs.writeFileSync(
        cacheFile,
        JSON.stringify({
            lastCheck: Date.now(),
            latestVersion,
        }),
    )
}

const hook: Hook<"init"> = async function (opts) {
    // Skip in test environments, JSON/agent output mode, or when explicitly disabled
    if (
        process.env.FREECLIMB_NO_UPDATE_CHECK === "1" ||
        process.env.FREECLIMB_OUTPUT_FORMAT === "json" ||
        process.env.NODE_ENV === "test" ||
        process.argv.includes("--json")
    ) {
        return
    }

    try {
        const cacheDir = opts.config.dataDir
        const cacheFile = path.join(cacheDir, "update-check.json")

        // Check if we've checked recently
        let lastCheck = 0
        let cachedLatest: string | null = null
        try {
            const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
            lastCheck = cached.lastCheck || 0
            cachedLatest = cached.latestVersion || null
        } catch {
            // No cache yet
        }

        const now = Date.now()

        // If cached version is newer, show notice from cache (no network)
        if (cachedLatest && isNewer(cachedLatest, currentVersion)) {
            process.stderr.write(
                `\u001B[2mUpdate available: ${currentVersion} \u2192 ${cachedLatest}. Run: freeclimb update\u001B[0m\n`,
            )
        }

        // Fire-and-forget background check if interval has passed
        if (now - lastCheck > CHECK_INTERVAL_MS) {
            checkLatestVersion(cacheDir, cacheFile).catch(() => {
                // Silently ignore all errors
            })
        }
    } catch {
        // Never block CLI execution
    }
}

// eslint-disable-next-line import/no-default-export -- oclif hooks require default export
export default hook
