import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class recordingsDelete extends Command {
    static description = ` Delete the specified recording. Both the audio file and the resource metadata are deleted.`
    static examples = [
        "<%= config.bin %> recordings:delete RE1234567890abcdef",
        "<%= config.bin %> recordings:delete RE1234567890abcdef --yes",
        "<%= config.bin %> recordings:delete RE1234567890abcdef --dry-run",
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
        recordingId: Args.string({
            description: "String that uniquely identifies this recording resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "recordings",
            commandName: "delete",
            endpoint: (args) => `Recordings/${args.recordingId}`,
            method: "DELETE",
            quietIdKey: "recordingId",
            dryRun: true,
            validations: [{ source: "args", key: "recordingId", rule: "resourceId" }],
            confirmation: {
                message: (args) =>
                    `Delete recording ${args.recordingId}? This permanently deletes the audio file. This cannot be undone.`,
            },
        }
        await runResourceCommand(this, spec)
    }
}
