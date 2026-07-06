import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferenceParticipantsList extends Command {
    static description = ` Retrieve a list of Participants in the specified Conference, sorted by date created, newest to oldest.`
    static examples = [
        "<%= config.bin %> conference-participants:list CF1234567890abcdef",
        "<%= config.bin %> conference-participants:list CF1234567890abcdef --json",
    ]

    static flags = {
        talk: Flags.string({
            char: "L",
            description: "Only show Participants with the talk privilege.",
            required: false,
            options: ["true", "false"],
        }),
        listen: Flags.string({
            char: "l",
            description: "Only show Participants with the listen privilege.",
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

    static args = {
        conferenceId: Args.string({
            description: "ID of the conference this participant is in.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "conference-participants",
            commandName: "list",
            endpoint: (args) => `Conferences/${args.conferenceId}/Participants`,
            method: "GET",
            quietIdKey: "callId",
            supportsNext: true,
            validations: [{ source: "args", key: "conferenceId", rule: "resourceId" }],
            buildParams: (args, flags) => ({
                talk: typeof flags.talk === "undefined" ? undefined : flags.talk === "true",
                listen: typeof flags.listen === "undefined" ? undefined : flags.listen === "true",
            }),
        }
        await runResourceCommand(this, spec)
    }
}
