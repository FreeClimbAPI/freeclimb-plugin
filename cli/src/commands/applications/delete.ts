import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class applicationsDelete extends Command {
    static description = ` Delete the specified application. If this application's ID is assigned to any Incoming phone number, that relationship will be cleared.`
    static examples = [
        "<%= config.bin %> applications:delete AP1234567890abcdef1234567890abcdef12345678",
        "<%= config.bin %> applications:delete AP1234567890abcdef1234567890abcdef12345678 --yes",
        "<%= config.bin %> applications:delete AP1234567890abcdef1234567890abcdef12345678 --dry-run",
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
        "dry-run": Flags.boolean({
            description:
                "Validate the request without executing it. Shows what would be sent to the API.",
            default: false,
        }),
        yes: Flags.boolean({
            char: "y",
            description:
                "Skip the confirmation prompt shown in interactive terminals (non-interactive runs never prompt).",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    static args = {
        applicationId: Args.string({
            description: "String that uniquely identifies this application resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "applications",
            commandName: "delete",
            endpoint: (args) => `Applications/${args.applicationId}`,
            method: "DELETE",
            quietIdKey: "applicationId",
            dryRun: true,
            validations: [{ source: "args", key: "applicationId", rule: "resourceId" }],
            confirmation: {
                message: (args) => `Delete application ${args.applicationId}? This cannot be undone.`,
            },
        }
        await runResourceCommand(this, spec)
    }
}
