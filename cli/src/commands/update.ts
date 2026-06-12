import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import axios from "axios"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { wrapJsonOutput } from "../ui/format.js"
import { createSpinner } from "../ui/spinner.js"
import { borderedBox, keyValue, statusIndicator } from "../ui/components.js"
import { BrandColors, supportsColor, isTTY } from "../ui/theme.js"

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../../package.json")
const { version: currentVersion } = JSON.parse(readFileSync(pkgPath, "utf-8"))

interface UpdateCheckResult {
    currentVersion: string
    installInstructions?: {
        homebrew?: string
        npm: string
    }
    latestVersion: string
    updateAvailable: boolean
}

export class Update extends Command {
    static description = `Check for newer versions of the FreeClimb CLI.

Queries the npm registry and compares against the installed version.
If an update is available, shows installation instructions.
`

    static flags = {
        json: Flags.boolean({
            description: "Output as JSON (for scripting/agents)",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    async run() {
        const { flags } = await this.parse(Update)

        let latestVersion: string

        if (!flags.json && isTTY()) {
            const spinner = createSpinner({ text: "Checking for updates..." })
            spinner.start()
            try {
                latestVersion = await this.fetchLatestVersion()
                spinner.succeed("Version check complete")
            } catch (error: any) {
                spinner.fail("Failed to check for updates")
                this.error(error.message, { exit: 1 })
            }
        } else {
            try {
                latestVersion = await this.fetchLatestVersion()
            } catch (error: any) {
                if (flags.json) {
                    this.log(
                        JSON.stringify(
                            {
                                success: false,
                                error: { message: error.message },
                                metadata: { timestamp: new Date().toISOString() },
                            },
                            null,
                            2,
                        ),
                    )
                    return
                }
                this.error(error.message, { exit: 1 })
            }
        }

        const updateAvailable = this.isNewer(latestVersion!, currentVersion)

        const result: UpdateCheckResult = {
            currentVersion,
            latestVersion: latestVersion!,
            updateAvailable,
        }

        if (updateAvailable) {
            result.installInstructions = {
                npm: `npm install -g freeclimb-cli@${latestVersion!}`,
                homebrew: "brew upgrade freeclimb",
            }
        }

        if (flags.json) {
            this.log(JSON.stringify(wrapJsonOutput(result), null, 2))
            return
        }

        this.log("")

        if (updateAvailable) {
            const lines = keyValue([
                { key: "Installed", value: currentVersion, valueColor: "warning" },
                { key: "Latest", value: latestVersion!, valueColor: "success" },
            ])
            lines.push(
                "",
                statusIndicator("info", "Update available! Install with:"),
                "",
                ...(supportsColor()
                    ? [
                          `  ${chalk.hex(BrandColors.orange)(`npm install -g freeclimb-cli@${latestVersion!}`)}`,
                          `  ${chalk.hex(BrandColors.orange)("brew upgrade freeclimb")}`,
                      ]
                    : [
                          `  npm install -g freeclimb-cli@${latestVersion!}`,
                          "  brew upgrade freeclimb",
                      ]),
                "",
            )
            this.log(borderedBox(lines, "Update Available"))
        } else {
            this.log(statusIndicator("pass", `FreeClimb CLI v${currentVersion} is up to date`))
        }

        this.log("")
    }

    private async fetchLatestVersion(): Promise<string> {
        const response = await axios.get("https://registry.npmjs.org/freeclimb-cli/latest", {
            timeout: 10_000,
        })
        return response.data.version
    }

    private isNewer(latest: string, current: string): boolean {
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
}
