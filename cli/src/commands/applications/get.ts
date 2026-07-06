import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class applicationsGet extends Command {
    static description = ` Retrieve a representation of the specified application.`
    static examples = [
        "<%= config.bin %> applications:get AP1234567890abcdef1234567890abcdef12345678",
        "<%= config.bin %> applications:get AP1234567890abcdef1234567890abcdef12345678 --json",
        "<%= config.bin %> applications:get AP1234567890abcdef1234567890abcdef12345678 --fields applicationId,alias,voiceUrl",
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
        applicationId: Args.string({
            description: "A string that uniquely identifies this application resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "applications",
            commandName: "get",
            endpoint: (args) => `Applications/${args.applicationId}`,
            method: "GET",
            quietIdKey: "applicationId",
            validations: [{ source: "args", key: "applicationId", rule: "resourceId" }],
        }
        await runResourceCommand(this, spec)
    }
}
