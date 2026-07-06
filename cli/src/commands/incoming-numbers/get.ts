import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class incomingNumbersGet extends Command {
    static description = ` Retrieve a representation of the specified incoming phone number.`
    static examples = [
        "<%= config.bin %> incoming-numbers:get PN1234567890abcdef",
        "<%= config.bin %> incoming-numbers:get PN1234567890abcdef --json",
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
        phoneNumberId: Args.string({
            description: "String that uniquely identifies this phone number resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "incoming-numbers",
            commandName: "get",
            endpoint: (args) => `IncomingPhoneNumbers/${args.phoneNumberId}`,
            method: "GET",
            quietIdKey: "phoneNumberId",
            validations: [{ source: "args", key: "phoneNumberId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
