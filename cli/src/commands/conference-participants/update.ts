import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferenceParticipantsUpdate extends Command {
    static description = ` Update the properties of the specified conference participant.`
    static examples = [
        "<%= config.bin %> conference-participants:update CF1234567890abcdef CA1234567890abcdef --talk true",
        "<%= config.bin %> conference-participants:update CF1234567890abcdef CA1234567890abcdef --listen false --dry-run",
    ]

    static flags = {
        talk: Flags.string({
            char: "L",
            description:
                "(Optional) Default is true. Setting to false mutes the Participant. FreeClimb returns an error and ignores any other value.",
            required: false,
            options: ["true", "false"],
        }),
        listen: Flags.string({
            char: "l",
            description:
                "(Optional) Default is true. Setting to false silences the Conference for this Participant. FreeClimb returns an error and ignores any other value.",
            required: false,
            options: ["true", "false"],
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
            commandName: "update",
            endpoint: (args) => `Conferences/${args.conferenceId}/Participants/${args.callId}`,
            method: "POST",
            quietIdKey: "callId",
            dryRun: true,
            validations: [
                { source: "args", key: "conferenceId", rule: "resourceId" },
                { source: "args", key: "callId", rule: "resourceId" },
            ],
            buildData: (args, flags) => ({
                talk: typeof flags.talk === "undefined" ? undefined : flags.talk === "true",
                listen: typeof flags.listen === "undefined" ? undefined : flags.listen === "true",
            }),
        }
        await runResourceCommand(this, spec)
    }
}
