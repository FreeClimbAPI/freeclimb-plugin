import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class exportsList extends Command {
    static description = ` Retrieve a list of Exports associated with the specified account, sorted from latest created to oldest.`
    static examples = [
        "<%= config.bin %> exports:list",
        "<%= config.bin %> exports:list --json",
        "<%= config.bin %> exports:list --quiet",
        "<%= config.bin %> exports:list --fields exportId,resourceType,status",
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
            topic: "exports",
            commandName: "list",
            endpoint: "Exports",
            method: "GET",
            quietIdKey: "exportId",
            supportsNext: true,
        }
        await runResourceCommand(this, spec)
    }
}
