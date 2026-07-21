import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class blobsList extends Command {
    static description = ` Retrieve a list of Blobs associated with the specified account, sorted from latest created to oldest.`
    static examples = [
        "<%= config.bin %> blobs:list",
        "<%= config.bin %> blobs:list --json",
        "<%= config.bin %> blobs:list --quiet",
        "<%= config.bin %> blobs:list --fields blobId,alias",
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

    async run() {
        const spec: CommandSpec = {
            topic: "blobs",
            commandName: "list",
            endpoint: "Blobs",
            method: "GET",
            quietIdKey: "blobId",
            supportsNext: true,
        }
        await runResourceCommand(this, spec)
    }
}
