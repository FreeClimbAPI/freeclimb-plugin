import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class incomingNumbersBuy extends Command {
    static description = ` Purchase a new phone number for the specified account. If the specified phone number is available, FreeClimb will add it to the account. To find an available phone number, use the /AvailablePhoneNumbers endpoint.`
    static examples = [
        "<%= config.bin %> incoming-numbers:buy --phoneNumber +12223334444",
        "<%= config.bin %> incoming-numbers:buy --phoneNumber +12223334444 --applicationId AP1234567890abcdef1234567890abcdef12345678 --dry-run",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Description for this new incoming phone number (max 64 characters).",
            required: false,
        }),
        applicationId: Flags.string({
            char: "A",
            description: "ID of the application that should handle phone calls to the number.",
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
        phoneNumber: Args.string({
            description:
                "Phone number to purchase in E.164 format (as returned in the list of Available Phone Numbers).",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "incoming-numbers",
            commandName: "buy",
            endpoint: "IncomingPhoneNumbers",
            method: "POST",
            quietIdKey: "phoneNumberId",
            dryRun: true,
            validations: [
                { source: "flags", key: "applicationId", rule: "resourceId" },
                { source: "args", key: "phoneNumber", rule: "controlChars" },
                { source: "flags", key: "alias", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                phoneNumber: args.phoneNumber,
                alias: flags.alias,
                applicationId: flags.applicationId,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
