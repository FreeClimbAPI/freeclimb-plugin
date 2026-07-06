import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class accountsGet extends Command {
    static description = ` Retrieve a representation of the specified Account.`
    static examples = [
        "<%= config.bin %> accounts:get",
        "<%= config.bin %> accounts:get --json",
        "<%= config.bin %> accounts:get --fields accountId,status",
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

    async run() {
        const spec: CommandSpec = {
            topic: "accounts",
            commandName: "get",
            endpoint: "",
            method: "GET",
            quietIdKey: "accountId",
        }
        await runResourceCommand(this, spec)
    }
}
