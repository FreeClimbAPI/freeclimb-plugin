import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class incomingNumbersUpdate extends Command {
    static description = ` Update the properties of the specified incoming phone number.`
    static examples = [
        "<%= config.bin %> incoming-numbers:update PN1234567890abcdef --applicationId AP1234567890abcdef1234567890abcdef12345678",
        "<%= config.bin %> incoming-numbers:update PN1234567890abcdef --applicationId AP1234567890abcdef1234567890abcdef12345678 --dry-run",
    ]

    static flags = {
        applicationId: Flags.string({
            char: "A",
            description: "ID of the Application that should handle calls to this number.",
            required: false,
        }),
        alias: Flags.string({
            char: "a",
            description: "Description for this phone number.",
            required: false,
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
        phoneNumberId: Args.string({
            description: "String that uniquely identifies this phone number resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "incoming-numbers",
            commandName: "update",
            endpoint: (args) => `IncomingPhoneNumbers/${args.phoneNumberId}`,
            method: "POST",
            quietIdKey: "phoneNumberId",
            dryRun: true,
            validations: [
                { source: "args", key: "phoneNumberId", rule: "resourceId" },
                { source: "flags", key: "applicationId", rule: "resourceId" },
                { source: "flags", key: "alias", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                applicationId: flags.applicationId,
                alias: flags.alias,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
