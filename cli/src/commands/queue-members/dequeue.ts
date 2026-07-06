import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class queueMembersDequeue extends Command {
    static description = ` Dequeue the specified Member. The Member's Call will begin executing the PerCL script returned from the callback specified in the actionUrl parameter when the Member was added.`
    static examples = [
        "<%= config.bin %> queue-members:dequeue QU1234567890abcdef CA1234567890abcdef",
        "<%= config.bin %> queue-members:dequeue QU1234567890abcdef CA1234567890abcdef --dry-run",
    ]

    static flags = {
        next: Flags.boolean({ hidden: true }),
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
        queueId: Args.string({
            description: "String that uniquely identifies the Queue that the Member belongs to.",
            required: true,
        }),
        callId: Args.string({
            description: "ID if the Call that the Member belongs to.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "queue-members",
            commandName: "dequeue",
            endpoint: (args) => `Queues/${args.queueId}/Members/${args.callId}`,
            method: "POST",
            quietIdKey: "callId",
            dryRun: true,
            validations: [
                { source: "args", key: "queueId", rule: "resourceId" },
                { source: "args", key: "callId", rule: "resourceId" },
            ],
        }
        await runResourceCommand(this, spec)
    }
}
