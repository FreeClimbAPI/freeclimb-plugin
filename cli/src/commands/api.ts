import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import axios from "axios"
import { cred } from "../credentials.js"
import { Environment } from "../environment.js"
import { wrapJsonOutput } from "../ui/format.js"
import { getOutputFormat } from "../agent-config.js"
import { rejectControlChars, filterFieldsDeep } from "../validation.js"

export class Api extends Command {
    static description = `Make authenticated API requests to FreeClimb.

This command allows you to make raw API requests with automatic
authentication. Useful for accessing endpoints not covered by
other CLI commands. Accepts the full API payload via --data as JSON.

The endpoint can be:
  - A path starting with / (e.g., /Calls) - recommended
  - A full FreeClimb URL (e.g., https://www.freeclimb.com/apiserver/Accounts/.../Calls)

For account-scoped endpoints, the account ID is automatically included.
Full URLs are restricted to FreeClimb domains for credential safety.
`

    static args = {
        endpoint: Args.string({
            description: "API endpoint path (e.g., /Calls, /Messages)",
            required: false,
        }),
    }

    static flags = {
        method: Flags.string({
            char: "X",
            description: "HTTP method",
            options: ["GET", "POST", "PUT", "DELETE"],
            default: "GET",
        }),
        data: Flags.string({
            char: "d",
            description: "JSON data for POST/PUT requests (accepts full API payload)",
        }),
        stdin: Flags.boolean({
            description: "Read JSON request body from stdin instead of --data flag",
            default: false,
        }),
        param: Flags.string({
            char: "p",
            description: "Query parameter (format: key=value, can be repeated)",
            multiple: true,
        }),
        fields: Flags.string({
            description:
                "Comma-separated list of fields to include in the response. Limits output to protect context windows when used by agents.",
        }),
        json: Flags.boolean({
            description:
                "Output as structured JSON. Also enabled via FREECLIMB_OUTPUT_FORMAT=json env var.",
            default: false,
        }),
        raw: Flags.boolean({
            description: "Output raw response without wrapping",
            default: false,
        }),
        "dry-run": Flags.boolean({
            description:
                "Validate the request without executing it. Shows what would be sent to the API.",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    static examples = [
        "$ freeclimb api /Calls",
        "$ freeclimb api /Calls --method GET",
        "$ freeclimb api /Calls -p status=completed -p to=+15551234567",
        '$ freeclimb api /Messages --method POST -d \'{"to":"+15551234567","from":"+15559876543","text":"Hello"}\'',
        "$ freeclimb api /IncomingPhoneNumbers --json",
        "$ freeclimb api /Calls --fields callId,status,from,to",
        '$ freeclimb api /Messages --method POST --dry-run -d \'{"to":"+15551234567"}\'',
        '$ echo \'{"to":"+15551234567","from":"+15559876543","text":"Hello"}\' | freeclimb api /Messages --method POST --stdin',
    ]

    async run() {
        const { args, flags: cmdFlags } = await this.parse(Api)
        const outputFormat = getOutputFormat(cmdFlags.json, cmdFlags.raw)

        let endpoint = args.endpoint!
        rejectControlChars(endpoint, "endpoint")

        // Normalize endpoint: strip MSYS/Git Bash path conversion artifacts
        // (e.g., "C:/Program Files/Git/Calls" back to "/Calls") and accept
        // bare paths like "Calls" as shorthand for "/Calls".
        if (process.platform === "win32" || process.env.MSYSTEM) {
            const msysMatch = endpoint.match(/^[A-Z]:\/Program Files\/Git\/(.+)$/i)
            if (msysMatch) {
                endpoint = `/${msysMatch[1]}`
            }
        }
        if (!endpoint.startsWith("/") && !endpoint.startsWith("http")) {
            endpoint = `/${endpoint}`
        }

        // Parse params and data before auth check so --dry-run works without credentials
        const params: Record<string, string> = {}
        if (cmdFlags.param) {
            for (const p of cmdFlags.param) {
                rejectControlChars(p, "param")
                const [key, ...valueParts] = p.split("=")
                if (key && valueParts.length > 0) {
                    params[key] = valueParts.join("=")
                }
            }
        }

        let data: unknown
        if (cmdFlags.stdin) {
            if (cmdFlags.data) {
                this.error("Cannot use both --stdin and --data flags", { exit: 1 })
            }
            const chunks: Buffer[] = []
            for await (const chunk of process.stdin) {
                chunks.push(Buffer.from(chunk))
            }
            const raw = Buffer.concat(chunks).toString("utf-8").trim()
            if (!raw) {
                this.error("No data received from stdin. Pipe data or use --data flag instead.", {
                    exit: 1,
                })
            }
            try {
                data = JSON.parse(raw)
            } catch {
                this.error("Invalid JSON received from stdin", { exit: 1 })
            }
        } else if (cmdFlags.data) {
            try {
                data = JSON.parse(cmdFlags.data)
            } catch {
                this.error(chalk.red("Invalid JSON in --data flag"), { exit: 1 })
            }
        }

        // Dry-run: show what would be sent without requiring credentials
        if (cmdFlags["dry-run"]) {
            const dryRunOutput = {
                dryRun: true,
                method: cmdFlags.method,
                endpoint,
                params: Object.keys(params).length > 0 ? params : undefined,
                data,
            }
            if (outputFormat === "json" || outputFormat === "raw") {
                this.log(JSON.stringify(dryRunOutput, null, 2))
            } else {
                this.log(chalk.yellow("DRY RUN - No API call will be made"))
                this.log(JSON.stringify(dryRunOutput, null, 2))
            }
            return
        }

        // Authenticate - required for all non-dry-run requests
        const accountId = await cred.accountId
        const apiKey = await cred.apiKey

        if (!accountId || !apiKey) {
            this.error(chalk.red("Not logged in. Run 'freeclimb login' to authenticate."), {
                exit: 1,
            })
        }

        const baseUrl =
            Environment.getString("FREECLIMB_CLI_BASE_URL") || "https://www.freeclimb.com/apiserver"

        let url = endpoint
        if (url.startsWith("/")) {
            url = `${baseUrl}/Accounts/${accountId}${url}`
        } else {
            try {
                const parsed = new URL(url)
                const allowedHosts = ["freeclimb.com", "www.freeclimb.com"]
                const isCustomBase = Environment.getString("FREECLIMB_CLI_BASE_URL") !== ""
                if (isCustomBase) {
                    const baseHost = new URL(baseUrl).hostname
                    allowedHosts.push(baseHost)
                }
                if (
                    !allowedHosts.some(
                        (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
                    )
                ) {
                    this.error(
                        chalk.red(
                            `Refusing to send credentials to non-FreeClimb host: ${parsed.hostname}\n` +
                                "Use a path starting with / for account-scoped endpoints, or set FREECLIMB_CLI_BASE_URL for custom domains.",
                        ),
                        { exit: 1 },
                    )
                }
            } catch {
                this.error(chalk.red(`Invalid URL: ${url}`), { exit: 1 })
            }
        }

        try {
            const response = await axios({
                url,
                method: cmdFlags.method as "GET" | "POST" | "PUT" | "DELETE",
                auth: { username: accountId, password: apiKey },
                params: Object.keys(params).length > 0 ? params : undefined,
                data,
                headers: {
                    "Content-Type": "application/json",
                },
            })

            let responseData = response.data
            if (cmdFlags.fields) {
                responseData = filterFieldsDeep(
                    responseData,
                    cmdFlags.fields.split(",").map((f: string) => f.trim()),
                )
            }

            if (outputFormat === "raw") {
                this.log(JSON.stringify(responseData, null, 2))
            } else if (outputFormat === "json") {
                this.log(
                    JSON.stringify(
                        wrapJsonOutput(responseData, {
                            command: `api ${args.endpoint}`,
                        }),
                        null,
                        2,
                    ),
                )
            } else {
                this.log(chalk.green(`${response.status} ${response.statusText}`))
                this.log("")
                this.log(JSON.stringify(responseData, null, 2))
            }
        } catch (error: any) {
            if (error.response) {
                const { status, statusText, data: errData } = error.response

                if (outputFormat === "json" || outputFormat === "raw") {
                    this.log(
                        JSON.stringify(
                            {
                                error: true,
                                status,
                                statusText,
                                data: errData,
                            },
                            null,
                            2,
                        ),
                    )
                    this.exit(1)
                } else {
                    this.error(
                        chalk.red(`${status} ${statusText}\n${JSON.stringify(errData, null, 2)}`),
                        { exit: 1 },
                    )
                }
            } else {
                this.error(chalk.red(`Request failed: ${error.message}`), { exit: 1 })
            }
        }
    }
}
