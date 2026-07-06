import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callsGet extends Command {
    static description = ` Retrieve a representation of the specified Call.`
    static examples = [
        "<%= config.bin %> calls:get CA1234567890abcdef",
        "<%= config.bin %> calls:get CA1234567890abcdef --json",
        "<%= config.bin %> calls:get CA1234567890abcdef --fields callId,status,from,to",
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
        callId: Args.string({
            description: "String that uniquely identifies this call resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "calls",
            commandName: "get",
            endpoint: (args) => `Calls/${args.callId}`,
            method: "GET",
            quietIdKey: "callId",
            validations: [{ source: "args", key: "callId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
