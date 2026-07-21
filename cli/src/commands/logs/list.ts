import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand, truncateLogs } from "../../executor.js"

export class logsList extends Command {
    static description = ` Returns all Logs associated with the specified account or a specific page of Logs as indicated by the URI in the request.`
    static examples = [
        "<%= config.bin %> logs:list",
        "<%= config.bin %> logs:list --json",
        "<%= config.bin %> logs:list --tail",
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
        help: Flags.help({ char: "h" }),
    }

    static args = {}

    async run() {
        const spec: CommandSpec = {
            topic: "logs",
            commandName: "list",
            endpoint: "Logs",
            method: "GET",
            quietIdKey: "requestId",
            supportsNext: true,
            buildParams: (args, flags) => ({
                ...(flags.maxItem ? { maxItems: flags.maxItem } : {}),
            }),
            transformResponse: truncateLogs,
            tail: {
                buildPql: (args, flags, lastTime) => `timestamp>${lastTime}`,
            },
        }
        await runResourceCommand(this, spec)
    }
}
