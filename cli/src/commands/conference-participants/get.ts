import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferenceParticipantsGet extends Command {
    static description = ` Retrieve a representation of the specified Conference Participant.`
    static examples = [
        "<%= config.bin %> conference-participants:get CF1234567890abcdef CA1234567890abcdef",
        "<%= config.bin %> conference-participants:get CF1234567890abcdef CA1234567890abcdef --json",
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
            commandName: "get",
            endpoint: (args) => `Conferences/${args.conferenceId}/Participants/${args.callId}`,
            method: "GET",
            quietIdKey: "callId",
            validations: [
                { source: "args", key: "conferenceId", rule: "resourceId" },
                { source: "args", key: "callId", rule: "resourceId" },
            ],
        }
        await runResourceCommand(this, spec)
    }
}
