import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class smsGet extends Command {
    static description = ` Retrieve a representation of the specified Message.`
    static examples = [
        "<%= config.bin %> sms:get SM1234567890abcdef",
        "<%= config.bin %> sms:get SM1234567890abcdef --json",
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
        messageId: Args.string({
            description: "String that uniquely identifies this Message resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "sms",
            commandName: "get",
            endpoint: (args) => `Messages/${args.messageId}`,
            method: "GET",
            quietIdKey: "messageId",
            validations: [{ source: "args", key: "messageId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
