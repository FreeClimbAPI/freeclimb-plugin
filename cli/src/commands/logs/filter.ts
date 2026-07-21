import { Args, Command, Flags } from "@oclif/core"
import chalk from "chalk"
import * as Errors from "../../errors.js"
import { CommandSpec, runResourceCommand, truncateLogs } from "../../executor.js"

export class logsFilter extends Command {
    static description = ` Returns the first page of Logs associated with the specified account.`
    static examples = [
        "<%= config.bin %> logs:filter \"level = 'ERROR'\"",
        "<%= config.bin %> logs:filter \"level = 'WARNING'\" --json",
        "<%= config.bin %> logs:filter \"level = 'INFO'\" --tail",
    ]

    static flags = {
        maxItem: Flags.integer({
            char: "m",
            description: "Show only a certain number of the most recent logs on this page.",
        }),
        tail: Flags.boolean({
            char: "t",
            description: "Polls the FreeClimb API to retrieve and display new logs as they occur.",
            default: false,
        }),
        sleep: Flags.integer({
            char: "q",
            description:
                "Determines time waited between request for tail command. Defaults at 1 second.",
            default: 1000,
        }),
        since: Flags.string({
            char: "Q",
            description:
                "Determines time frame of logs to be printed out before starting tail. Ex.2h9m",
            dependsOn: ["tail"],
        }),
        next: Flags.boolean({ char: "n", description: "Displays the next page of output." }),
        json: Flags.boolean({
            description:
                "Output as a structured JSON envelope with request metadata. Also enabled globally via FREECLIMB_OUTPUT_FORMAT=json.",
            default: false,
        }),
        quiet: Flags.boolean({
            description:
                "Output only resource IDs, one per line. Useful for piping into other commands.",
            default: false,
        }),
        fields: Flags.string({
            description:
                "Comma-separated list of fields to include in the response. Limits output to protect context windows when used by agents.",
        }),
        "dry-run": Flags.boolean({
            description:
                "Validate the request without executing it. Shows what would be sent to the API.",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    static args = {
        pql: Args.string({ description: "The filter query for retrieving logs.", required: true }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "logs",
            commandName: "filter",
            endpoint: "Logs",
            method: "POST",
            quietIdKey: "requestId",
            supportsNext: true,
            dryRun: true,
            validations: [{ source: "args", key: "pql", rule: "controlChars" }],
            afterParse: (command, args) => {
                if (args.pql.includes("'")) {
                    command.warn(
                        chalk.yellow(
                            "A single quote has been detected in your pql. Keep in mind that all strings must be encapsulated by double quotes for the pql to be valid. If this was a mistake, please rerun the command with your rewritten pql. The command will now run.",
                        ),
                    )
                }
            },
            buildData: (args, flags) => ({
                pql: args.pql,
            }),
            transformResponse: truncateLogs,
            tail: {
                beforeTail: (command, args) => {
                    if (args.pql.includes("timestamp")) {
                        const err = new Errors.NoTimestamp()
                        command.error(err.message, { exit: err.code })
                    }
                },
                buildPql: (args, flags, lastTime) => `${args.pql} AND timestamp>${lastTime}`,
            },
        }
        await runResourceCommand(this, spec)
    }
}
