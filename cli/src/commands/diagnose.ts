import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { getBaseUrl } from "@freeclimb/core"
import { cred } from "../credentials.js"
import { Environment } from "../environment.js"
import { apiRequest, publicRequest, FreeClimbHttpError } from "../http.js"
import { wrapJsonOutput } from "../ui/format.js"
import { createSpinner, Spinner } from "../ui/spinner.js"
import { borderedBox, statusIndicator } from "../ui/components.js"
import { BrandColors, supportsColor, isTTY, getTerminalWidth } from "../ui/theme.js"
import { icons } from "../ui/chars.js"

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

interface CachedCredentials {
    accountId: string | undefined
    apiKey: string | undefined
}

interface ConnectivityProbe {
    baseUrl: string
    error?: { code?: string; message: string }
    latency?: number
}

interface AccountProbe {
    account?: { status?: string; type?: string }
    error?: { message: string; status?: number }
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

    private cachedCredentials: CachedCredentials | null = null

    async run() {
        const { flags } = await this.parse(Diagnose)

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

        await this.checkCredentials(result)

        const credentials = await this.loadCredentials()
        const hasCredentials = Boolean(credentials.accountId && credentials.apiKey)

        const [connectivityProbe, accountProbe] = await Promise.all([
            this.probeConnectivity(),
            hasCredentials ? this.probeAccount() : Promise.resolve(null),
        ])

        this.applyConnectivityCheck(result, connectivityProbe)
        this.applyAuthenticationCheck(result, accountProbe, hasCredentials)
        this.applyAccountStatusCheck(result, accountProbe, hasCredentials)

        const hasFail = result.checks.some((c) => c.status === "fail")
        const hasWarn = result.checks.some((c) => c.status === "warn")
        result.overallStatus = hasFail ? "error" : hasWarn ? "degraded" : "healthy"

        if (flags.json) {
            this.log(JSON.stringify(wrapJsonOutput(result), null, 2))
            return
        }

        this.renderSummary(result)
    }

    private async loadCredentials(): Promise<CachedCredentials> {
        if (!this.cachedCredentials) {
            this.cachedCredentials = {
                accountId: await cred.accountId,
                apiKey: await cred.apiKey,
            }
        }
        return this.cachedCredentials
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
            const { accountId, apiKey } = await this.loadCredentials()

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

    private async probeConnectivity(): Promise<ConnectivityProbe> {
        const baseUrl = getBaseUrl()

        try {
            const start = Date.now()
            await publicRequest({ method: "GET", path: "", timeout: 10000 })
            return { baseUrl, latency: Date.now() - start }
        } catch (error: any) {
            return {
                baseUrl,
                error: { code: error.code, message: error.message },
            }
        }
    }

    private async probeAccount(): Promise<AccountProbe> {
        try {
            const response = await apiRequest<{ status?: string; type?: string }>({
                method: "GET",
                path: "",
                timeout: 10000,
            })
            return { account: response.data }
        } catch (error: unknown) {
            const httpError = error instanceof FreeClimbHttpError ? error : undefined
            return {
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    status: httpError?.status,
                },
            }
        }
    }

    private applyConnectivityCheck(result: DiagnoseResult, probe: ConnectivityProbe): void {
        const checkName = "API Connectivity"
        this.startCheck(checkName)

        if (probe.error) {
            if (probe.error.code === "ECONNREFUSED") {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Cannot connect to FreeClimb API",
                    "Check your internet connection",
                )
            } else if (probe.error.code === "ETIMEDOUT") {
                this.endCheck(
                    result,
                    checkName,
                    "fail",
                    "Connection timed out",
                    "Network may be slow or blocked",
                )
            } else {
                this.endCheck(
                    result,
                    checkName,
                    "warn",
                    "API check returned error",
                    probe.error.message,
                )
            }
            return
        }

        const latency = probe.latency ?? 0
        if (latency > 2000) {
            this.endCheck(
                result,
                checkName,
                "warn",
                `API reachable but slow (${latency}ms)`,
                "Check your network connection",
            )
        } else {
            this.endCheck(result, checkName, "pass", `API reachable (${latency}ms)`, probe.baseUrl)
        }
    }

    private applyAuthenticationCheck(
        result: DiagnoseResult,
        probe: AccountProbe | null,
        hasCredentials: boolean,
    ): void {
        const checkName = "Authentication"
        this.startCheck(checkName)

        if (!hasCredentials) {
            this.endCheck(result, checkName, "fail", "No credentials to test")
            return
        }

        if (!probe) {
            this.endCheck(result, checkName, "fail", "Authentication check failed")
            return
        }

        if (probe.account) {
            this.endCheck(result, checkName, "pass", "Authentication successful")
            return
        }

        const status = probe.error?.status
        if (status === 401) {
            this.endCheck(
                result,
                checkName,
                "fail",
                "Invalid credentials",
                "Run 'freeclimb login' to re-authenticate",
            )
        } else if (status === 403) {
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
                probe.error?.message,
            )
        }
    }

    private applyAccountStatusCheck(
        result: DiagnoseResult,
        probe: AccountProbe | null,
        hasCredentials: boolean,
    ): void {
        const checkName = "Account Status"
        this.startCheck(checkName)

        if (!hasCredentials) {
            this.endCheck(result, checkName, "fail", "Cannot check - no credentials")
            return
        }

        if (!probe) {
            this.endCheck(result, checkName, "fail", "Cannot check - authentication failed")
            return
        }

        if (probe.account) {
            const status = probe.account.status?.toLowerCase()
            const type = probe.account.type?.toLowerCase()

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
            return
        }

        const authStatus = probe.error?.status
        if (authStatus === 401 || authStatus === 403) {
            this.endCheck(result, checkName, "fail", "Cannot check - authentication failed")
        } else {
            this.endCheck(
                result,
                checkName,
                "warn",
                "Could not fetch account status",
                probe.error?.message,
            )
        }
    }

    private renderSummary(result: DiagnoseResult): void {
        const width = Math.min(getTerminalWidth(), 80)
        this.log("")

        const summaryLines: string[] = []

        const passCount = result.checks.filter((c) => c.status === "pass").length
        const failCount = result.checks.filter((c) => c.status === "fail").length
        const warnCount = result.checks.filter((c) => c.status === "warn").length

        summaryLines.push(
            "",
            `  ${icons.success()} ${passCount} passed  ${icons.error()} ${failCount} failed  ${icons.warning()} ${warnCount} warnings`,
            "",
        )

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

        const maxLineLen = width - 6
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
