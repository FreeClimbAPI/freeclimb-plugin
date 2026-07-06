import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class recordingsList extends Command {
    static description = ` Retrieve a list of metadata for recordings associated with the specified account, sorted from latest created to oldest.`
    static examples = [
        "<%= config.bin %> recordings:list",
        "<%= config.bin %> recordings:list --json",
        "<%= config.bin %> recordings:list --quiet",
    ]

    static flags = {
        callId: Flags.string({
            char: "c",
            description: "Show only Recordings made during the Call with this ID.",
            required: false,
        }),
        conferenceId: Flags.string({
            char: "C",
            description: "Show only Recordings made during the conference with this ID.",
            required: false,
        }),
        dateCreated: Flags.string({
            char: "d",
            description: "Only show Recordings created on this date, formatted as YYYY-MM-DD.",
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
        const spec: CommandSpec = {
            topic: "recordings",
            commandName: "list",
            endpoint: "Recordings",
            method: "GET",
            quietIdKey: "recordingId",
            supportsNext: true,
            validations: [
                { source: "flags", key: "callId", rule: "resourceId" },
                { source: "flags", key: "conferenceId", rule: "resourceId" },
                { source: "flags", key: "dateCreated", rule: "controlChars" },
            ],
            buildParams: (args, flags) => ({
                callId: flags.callId,
                conferenceId: flags.conferenceId,
                dateCreated: flags.dateCreated,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
