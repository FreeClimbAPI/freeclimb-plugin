import { Command, Flags } from "@oclif/core"
import chalk from "chalk"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class accountsManage extends Command {
    static description = `This command allows you to manage an account.`
    static examples = [
        '<%= config.bin %> accounts:manage --alias "My Account"',
        '<%= config.bin %> accounts:manage --alias "My Account" --json',
        '<%= config.bin %> accounts:manage --dry-run --alias "My Account"',
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Description for this account.",
            required: false,
        }),
        label: Flags.string({
            char: "l",
            description: "Group to which this account belongs.",
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

    async run() {
        const spec: CommandSpec = {
            topic: "accounts",
            commandName: "manage",
            endpoint: "",
            method: "POST",
            quietIdKey: "accountId",
            dryRun: true,
            validations: [
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "label", rule: "controlChars" },
            ],
            afterParse: (command, _args, flags) => {
                if (!flags.alias && !flags.label) {
                    command.warn(
                        chalk.yellow(
                            "Nothing Has Been Updated: Please enter a parameter to update ('freeclimb accounts:manage -h' for a list of parameters to be updated)",
                        ),
                    )
                }
            },
            skipRequest: (_args, flags) => !flags.alias && !flags.label,
            buildData: (_args, flags) => {
                const data: Record<string, unknown> = {}
                if (flags.alias !== undefined) data.alias = flags.alias
                if (flags.label !== undefined) data.label = flags.label
                return data
            },
        }
        await runResourceCommand(this, spec)
    }
}
