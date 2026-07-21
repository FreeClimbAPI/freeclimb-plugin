import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class exportsGet extends Command {
    static description = ` Retrieve metadata for a specific Export.`
    static examples = [
        "<%= config.bin %> exports:get EX1234567890abcdef",
        "<%= config.bin %> exports:get EX1234567890abcdef --json",
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
        exportId: Args.string({
            description: "String that uniquely identifies this Export resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "exports",
            commandName: "get",
            endpoint: (args) => `Exports/${args.exportId}`,
            method: "GET",
            quietIdKey: "exportId",
            validations: [{ source: "args", key: "exportId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
