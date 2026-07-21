import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class blobsModify extends Command {
    static description = ` Partially update a Blob within the specified account.`
    static examples = [
        '<%= config.bin %> blobs:modify BL1234567890abcdef --data \'{"value":2}\'',
        '<%= config.bin %> blobs:modify BL1234567890abcdef --data \'{"value":2}\' --dry-run',
    ]

    static flags = {
        data: Flags.string({
            char: "d",
            description: "Blob fields to update as a JSON string.",
            required: true,
        }),
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
        blobId: Args.string({
            description: "String that uniquely identifies this Blob resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "blobs",
            commandName: "modify",
            endpoint: (args) => `Blobs/${args.blobId}`,
            method: "PATCH",
            quietIdKey: "blobId",
            dryRun: true,
            validations: [
                { source: "args", key: "blobId", rule: "resourceId" },
                { source: "flags", key: "data", rule: "controlChars" },
            ],
            afterParse: (command, _args, flags) => {
                try {
                    flags.parsedData = JSON.parse(flags.data)
                } catch {
                    command.error("--data is not valid JSON", { exit: 2 })
                }
            },
            buildData: (_args, flags) => flags.parsedData,
        }
        await runResourceCommand(this, spec)
    }
}
