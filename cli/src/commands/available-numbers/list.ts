import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class availableNumbersList extends Command {
    static description = ` Search for phone numbers that are available for purchase. To purchase an available phone number, the number should be submitted via POST to the /IncomingPhoneNumbers endpoint.`
    static examples = [
        "<%= config.bin %> available-numbers:list",
        "<%= config.bin %> available-numbers:list --alias 123-456-7890",
        "<%= config.bin %> available-numbers:list --json",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Filter on numbers based on the formatted string of the phone number.",
            required: false,
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
        phoneNumber: Flags.string({
            char: "p",
            description:
                "PCRE-compatible regular expression to filter against phoneNumber field, which is in E.164 format.",
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
        const { flags } = await this.parse(availableNumbersList)
        if (flags.alias && !/\d{3}-\d{3}-\d{4}/.test(flags.alias)) {
            this.warn(
                chalk.yellow(
                    "Incorrect Format: Please enter an alias in the format '123-456-7890'",
                ),
            )
        }
        const spec: CommandSpec = {
            topic: "available-numbers",
            commandName: "list",
            endpoint: "AvailablePhoneNumbers",
            method: "GET",
            quietIdKey: "phoneNumber",
            authenticate: false,
            supportsNext: true,
            validations: [
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "country", rule: "controlChars" },
                { source: "flags", key: "region", rule: "controlChars" },
                { source: "flags", key: "phoneNumber", rule: "controlChars" },
            ],
            buildParams: (args, flags) => ({
                alias: flags.alias,
                country: flags.country,
                region: flags.region,
                smsEnabled:
                    typeof flags.smsEnabled === "undefined" ? undefined : flags.smsEnabled === "true",
                voiceEnabled:
                    typeof flags.voiceEnabled === "undefined"
                        ? undefined
                        : flags.voiceEnabled === "true",
                phoneNumber: flags.phoneNumber,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
