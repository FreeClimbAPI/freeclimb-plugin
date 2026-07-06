import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class applicationsList extends Command {
    static description = ` Retrieve a list of Applications associated with the specified account, sorted from latest created to oldest.`
    static examples = [
        "<%= config.bin %> applications:list",
        "<%= config.bin %> applications:list --json",
        "<%= config.bin %> applications:list --quiet",
        "<%= config.bin %> applications:list --fields applicationId,alias",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Return only applications with aliases that exactly match this value.",
            required: false,
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

    async run() {
        const spec: CommandSpec = {
            topic: "applications",
            commandName: "list",
            endpoint: "Applications",
            method: "GET",
            quietIdKey: "applicationId",
            supportsNext: true,
            validations: [{ source: "flags", key: "alias", rule: "controlChars" }],
            buildParams: (args, flags) => ({ alias: flags.alias }),
        }
        await runResourceCommand(this, spec)
    }
}
