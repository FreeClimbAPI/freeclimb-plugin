import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class incomingNumbersList extends Command {
    static description = ` Retrieve a list of Incoming Phone Numbers associated with the specified account, sorted from newest to oldest.`
    static examples = [
        "<%= config.bin %> incoming-numbers:list",
        "<%= config.bin %> incoming-numbers:list --json",
        "<%= config.bin %> incoming-numbers:list --quiet",
    ]

    static flags = {
        phoneNumber: Flags.string({
            char: "p",
            description:
                "Only show incoming phone number resources that match this PCRE-compatible regular expression.",
            required: false,
        }),
        alias: Flags.string({
            char: "a",
            description:
                "Only show incoming phone numbers with aliases that exactly match this value.",
            required: false,
        }),
        applicationId: Flags.string({
            char: "A",
            description: "Filters numbers by application ID.",
            required: false,
        }),
        hasApplication: Flags.string({
            char: "h",
            description:
                "Filters numbers by whether or not they are associated with an application.",
            required: false,
            options: ["true", "false"],
        }),
        country: Flags.string({
            char: "C",
            description: "Filters numbers by two character ISO country code.",
            required: false,
        }),
        region: Flags.string({
            char: "r",
            description:
                "Filters numbers by two letter state abbreviation. This flag is only available for US numbers.",
            required: false,
        }),
        smsEnabled: Flags.string({
            char: "E",
            description: "Filters numbers based on SMS capability.",
            required: false,
            options: ["true", "false"],
        }),
        voiceEnabled: Flags.string({
            char: "o",
            description: "Filters numbers based on voice capability.",
            required: false,
            options: ["true", "false"],
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
            topic: "incoming-numbers",
            commandName: "list",
            endpoint: "IncomingPhoneNumbers",
            method: "GET",
            quietIdKey: "phoneNumberId",
            supportsNext: true,
            validations: [
                { source: "flags", key: "applicationId", rule: "resourceId" },
                { source: "flags", key: "phoneNumber", rule: "controlChars" },
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "country", rule: "controlChars" },
                { source: "flags", key: "region", rule: "controlChars" },
            ],
            buildParams: (args, flags) => ({
                phoneNumber: flags.phoneNumber,
                alias: flags.alias,
                applicationId: flags.applicationId,
                hasApplication:
                    typeof flags.hasApplication === "undefined"
                        ? undefined
                        : flags.hasApplication === "true",
                country: flags.country,
                region: flags.region,
                smsEnabled:
                    typeof flags.smsEnabled === "undefined" ? undefined : flags.smsEnabled === "true",
                voiceEnabled:
                    typeof flags.voiceEnabled === "undefined"
                        ? undefined
                        : flags.voiceEnabled === "true",
            }),
        }
        await runResourceCommand(this, spec)
    }
}
