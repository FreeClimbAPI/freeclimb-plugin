import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import axios from "axios"
import { cred } from "../credentials.js"
import { Environment } from "../environment.js"
import { wrapJsonOutput } from "../ui/format.js"
import { createSpinner, Spinner } from "../ui/spinner.js"
import { borderedBox, statusIndicator, keyValue } from "../ui/components.js"
import { BrandColors, supportsColor, isTTY, getTerminalWidth } from "../ui/theme.js"
import { icons, getBoxChars } from "../ui/chars.js"

interface DiagnoseResult {
    checks: {
        details?: string
        message: string
        name: string
        status: "pass" | "fail" | "warn"
    }[]
    overallStatus: "healthy" | "degraded" | "error"
    timestamp: string
}

export class Diagnose extends Command {
    static description = `Run diagnostic checks on connectivity and authentication.

Performs the following checks:
  - Credential configuration (env vars, keytar)
  - API connectivity
  - Authentication validity
  - Account status

Useful for troubleshooting authentication or connectivity issues.
`

    static flags = {
        json: Flags.boolean({
            description: "Output as JSON (for scripting/agents)",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    private useSpinners = false

    private jsonMode = false

    private currentSpinner: Spinner | null = null

    async run() {
        const { flags } = await this.parse(Diagnose)

        // Use spinners only for TTY and non-JSON output
        this.jsonMode = flags.json
        this.useSpinners = !flags.json && isTTY()

        const result: DiagnoseResult = {
            timestamp: new Date().toISOString(),
            checks: [],
            overallStatus: "healthy",
        }

        if (!flags.json) {
            this.log("")
            if (supportsColor()) {
                this.log(chalk.hex(BrandColors.lightTeal).bold("FreeClimb Diagnostics"))
            } else {
                this.log("FreeClimb Diagnostics")
            }
            this.log(chalk.dim("\u2500".repeat(40)))
            this.log("")
        }

        // Check 1: Credentials configuration
        await this.checkCredentials(result)

        // Check 2: API connectivity
        await this.checkConnectivity(result)

        // Check 3: Authentication
        await this.checkAuthentication(result)

        // Check 4: Account status
        await this.checkAccountStatus(result)

        // Determine overall status
        const hasFail = result.checks.some((c) => c.status === "fail")
        const hasWarn = result.checks.some((c) => c.status === "warn")
        result.overallStatus = hasFail ? "error" : hasWarn ? "degraded" : "healthy"

        if (flags.json) {
            this.log(JSON.stringify(wrapJsonOutput(result), null, 2))
            return
        }

        // Render summary
        this.renderSummary(result)
    }

    private startCheck(name: string): void {
        if (this.useSpinners) {
            this.currentSpinner = createSpinner({ text: `Checking ${name}...` })
            this.currentSpinner.start()
        }
    }

    private endCheck(
        result: DiagnoseResult,
        name: string,
        status: "pass" | "fail" | "warn",
        message: string,
        details?: string,
    ): void {
        result.checks.push({ name, status, message, details })

        if (this.useSpinners && this.currentSpinner) {
            switch (status) {
                case "pass": {
                    this.currentSpinner.succeed(`${name}: ${message}`)
                    break
                }
                case "fail": {
                    this.currentSpinner.fail(`${name}: ${message}`)
                    break
                }
                case "warn": {
                    this.currentSpinner.warn(`${name}: ${message}`)
                    break
                }
            }
            if (details) {
                this.log(chalk.dim(`  ${details}`))
            }
            this.currentSpinner = null
        } else if (!this.useSpinners && !this.jsonMode) {
            // Non-TTY, non-JSON output
            this.log(statusIndicator(status, `${name}: ${message}`))
            if (details) {
                this.log(chalk.dim(`  ${details}`))
            }
        }
    }

    private async checkCredentials(result: DiagnoseResult): Promise<void> {
        const checkName = "Credentials"
        this.startCheck(checkName)

        try {
            const accountId = await cred.accountId
            const apiKey = await cred.apiKey

            if (!accountId || !apiKey) {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "No credentials found",
                    "Run 'freeclimb login' to configure credentials",
                )
                return
            }

            const envAccountId =
                Environment.getString("FREECLIMB_ACCOUNT_ID") || Environment.getString("ACCOUNT_ID")
            const envApiKey =
                Environment.getString("FREECLIMB_API_KEY") || Environment.getString("API_KEY")

            let source = "keytar (secure storage)"
            if (envAccountId && envApiKey) {
                source = "environment variables"
            }

            this.endCheck(
                result,
                checkName,
                "pass",
                `Credentials configured via ${source}`,
                `Account ID: ${accountId.slice(0, 10)}...`,
            )
        } catch (error: any) {
            this.endCheck(result, checkName, "fail", "Failed to read credentials", error.message)
        }
    }

    private async checkConnectivity(result: DiagnoseResult): Promise<void> {
        const checkName = "API Connectivity"
        this.startCheck(checkName)

        const baseUrl =
            Environment.getString("FREECLIMB_CLI_BASE_URL") || "https://www.freeclimb.com/apiserver"

        try {
            const start = Date.now()
            await axios.get(baseUrl, { timeout: 10000 })
            const latency = Date.now() - start

            if (latency > 2000) {
                this.endCheck(
                    result,
                    checkName,
                    "warn",
                    `API reachable but slow (${latency}ms)`,
                    "Check your network connection",
                )
            } else {
                this.endCheck(result, checkName, "pass", `API reachable (${latency}ms)`, baseUrl)
            }
        } catch (error: any) {
            if (error.code === "ECONNREFUSED") {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Cannot connect to FreeClimb API",
                    "Check your internet connection",
                )
            } else if (error.code === "ETIMEDOUT") {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Connection timed out",
                    "Network may be slow or blocked",
                )
            } else {
                this.endCheck(result, checkName, "warn", "API check returned error", error.message)
            }
        }
    }

    private async checkAuthentication(result: DiagnoseResult): Promise<void> {
        const checkName = "Authentication"
        this.startCheck(checkName)

        try {
            const accountId = await cred.accountId
            const apiKey = await cred.apiKey

            if (!accountId || !apiKey) {
                this.endCheck(result, checkName, "fail", "No credentials to test")
                return
            }

            const baseUrl =
                Environment.getString("FREECLIMB_CLI_BASE_URL") ||
                "https://www.freeclimb.com/apiserver"

            const response = await axios.get(`${baseUrl}/Accounts/${accountId}`, {
                auth: { username: accountId, password: apiKey },
                timeout: 10000,
            })

            if (response.status === 200) {
                this.endCheck(result, checkName, "pass", "Authentication successful")
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Invalid credentials",
                    "Run 'freeclimb login' to re-authenticate",
                )
            } else if (error.response?.status === 403) {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Account access denied",
                    "Check your account status",
                )
            } else {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Authentication check failed",
                    error.message,
                )
            }
        }
    }

    private async checkAccountStatus(result: DiagnoseResult): Promise<void> {
        const checkName = "Account Status"
        this.startCheck(checkName)

        try {
            const accountId = await cred.accountId
            const apiKey = await cred.apiKey

            if (!accountId || !apiKey) {
                this.endCheck(result, checkName, "fail", "Cannot check - no credentials")
                return
            }

            const baseUrl =
                Environment.getString("FREECLIMB_CLI_BASE_URL") ||
                "https://www.freeclimb.com/apiserver"

            const response = await axios.get(`${baseUrl}/Accounts/${accountId}`, {
                auth: { username: accountId, password: apiKey },
                timeout: 10000,
            })

            const account = response.data
            const status = account.status?.toLowerCase()
            const type = account.type?.toLowerCase()

            if (status === "active") {
                const typeLabel = type === "trial" ? " (trial)" : ""
                this.endCheck(result, checkName, "pass", `Account active${typeLabel}`)
            } else if (status === "suspended") {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Account suspended",
                    "Contact support@freeclimb.com",
                )
            } else {
                this.endCheck(result, checkName, "warn", `Account status: ${status}`)
            }
        } catch (error: any) {
            // Skip if auth already failed
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.endCheck(result, checkName, "fail", "Cannot check - authentication failed")
            } else {
                this.endCheck(
                    result,
                    checkName,
                    "warn",
                    "Could not fetch account status",
                    error.message,
                )
            }
        }
    }

    private renderSummary(result: DiagnoseResult): void {
        const width = Math.min(getTerminalWidth(), 80)
        this.log("")

        // Summary header
        const summaryLines: string[] = []

        // Count results
        const passCount = result.checks.filter((c) => c.status === "pass").length
        const failCount = result.checks.filter((c) => c.status === "fail").length
        const warnCount = result.checks.filter((c) => c.status === "warn").length

        summaryLines.push(
            "",
            `  ${icons.success()} ${passCount} passed  ${icons.error()} ${failCount} failed  ${icons.warning()} ${warnCount} warnings`,
            "",
        )

        // Overall status message
        let statusMessage: string
        let statusColor: "success" | "warning" | "error"

        switch (result.overallStatus) {
            case "healthy": {
                statusMessage = "All checks passed! Your FreeClimb CLI is configured correctly."
                statusColor = "success"
                break
            }
            case "degraded": {
                statusMessage = "Some checks have warnings. Review the details above."
                statusColor = "warning"
                break
            }
            case "error": {
                statusMessage = "Some checks failed. Please address the issues above."
                statusColor = "error"
                break
            }
        }

        // Word-wrap status message to fit within the box
        const maxLineLen = width - 6 // 2 borders + 2 padding + 2 indent
        const words = statusMessage.split(" ")
        const wrappedLines: string[] = []
        let currentLine = ""
        for (const word of words) {
            if (currentLine.length + word.length + 1 > maxLineLen) {
                wrappedLines.push(currentLine)
                currentLine = word
            } else {
                currentLine = currentLine ? `${currentLine} ${word}` : word
            }
        }
        if (currentLine) wrappedLines.push(currentLine)

        if (supportsColor()) {
            const colorFn =
                statusColor === "success"
                    ? chalk.hex("#3fb950")
                    : statusColor === "warning"
                      ? chalk.hex(BrandColors.orange)
                      : chalk.red
            for (const line of wrappedLines) {
                summaryLines.push(`  ${colorFn(line)}`)
            }
        } else {
            for (const line of wrappedLines) {
                summaryLines.push(`  ${line}`)
            }
        }

        summaryLines.push("")

        this.log(borderedBox(summaryLines, "Summary", width))
        this.log("")
    }
}
