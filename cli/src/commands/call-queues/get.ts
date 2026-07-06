import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callQueuesGet extends Command {
    static description = ` Retrieve a representation of the specified Queue.`
    static examples = [
        "<%= config.bin %> call-queues:get QU1234567890abcdef",
        "<%= config.bin %> call-queues:get QU1234567890abcdef --json",
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
            description: "A string that uniquely identifies this queue resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "call-queues",
            commandName: "get",
            endpoint: (args) => `Queues/${args.queueId}`,
            method: "GET",
            quietIdKey: "queueId",
            validations: [{ source: "args", key: "queueId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
