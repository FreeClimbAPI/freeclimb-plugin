import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class queueMembersGet extends Command {
    static description = ` Retrieve a representation of the specified Queue Member.`
    static examples = [
        "<%= config.bin %> queue-members:get QU1234567890abcdef CA1234567890abcdef",
        "<%= config.bin %> queue-members:get QU1234567890abcdef CA1234567890abcdef --json",
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
        help: Flags.help({ char: "h" }),
    }

    static args = {
        queueId: Args.string({
            description: "String that uniquely identifies the Queue that the Member belongs to.",
            required: true,
        }),
        callId: Args.string({
            description: "ID of the Call that the Member belongs to.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "queue-members",
            commandName: "get",
            endpoint: (args) => `Queues/${args.queueId}/Members/${args.callId}`,
            method: "GET",
            quietIdKey: "callId",
            validations: [
                { source: "args", key: "queueId", rule: "resourceId" },
                { source: "args", key: "callId", rule: "resourceId" },
            ],
        }
        await runResourceCommand(this, spec)
    }
}
