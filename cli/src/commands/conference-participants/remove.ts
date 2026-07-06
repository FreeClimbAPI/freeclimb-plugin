import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferenceParticipantsRemove extends Command {
    static description = ` Remove the specified Participant from the Conference.`
    static examples = [
        "<%= config.bin %> conference-participants:remove CF1234567890abcdef CA1234567890abcdef",
        "<%= config.bin %> conference-participants:remove CF1234567890abcdef CA1234567890abcdef --yes",
        "<%= config.bin %> conference-participants:remove CF1234567890abcdef CA1234567890abcdef --dry-run",
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
        conferenceId: Args.string({
            description: "ID of the conference this participant is in.",
            required: true,
        }),
        callId: Args.string({
            description: "ID of the Call associated with this participant.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "conference-participants",
            commandName: "remove",
            endpoint: (args) => `Conferences/${args.conferenceId}/Participants/${args.callId}`,
            method: "DELETE",
            quietIdKey: "callId",
            dryRun: true,
            validations: [
                { source: "args", key: "conferenceId", rule: "resourceId" },
                { source: "args", key: "callId", rule: "resourceId" },
            ],
            confirmation: {
                message: (args) =>
                    `Remove participant ${args.callId} from conference ${args.conferenceId}? This cannot be undone.`,
            },
        }
        await runResourceCommand(this, spec)
    }
}
