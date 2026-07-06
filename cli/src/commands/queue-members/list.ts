import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class queueMembersList extends Command {
    static description = ` Retrieve a list of Members in the specified Queue.`
    static examples = [
        "<%= config.bin %> queue-members:list QU1234567890abcdef",
        "<%= config.bin %> queue-members:list QU1234567890abcdef --json",
    ]

    static flags = {
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

    static args = {
        queueId: Args.string({
            description: "String that uniquely identifies the Queue that the Member belongs to.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "queue-members",
            commandName: "list",
            endpoint: (args) => `Queues/${args.queueId}/Members`,
            method: "GET",
            quietIdKey: "callId",
            supportsNext: true,
            validations: [{ source: "args", key: "queueId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
