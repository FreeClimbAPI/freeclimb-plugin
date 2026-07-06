import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferencesUpdate extends Command {
    static description = ` Update the properties of the specified conference.`
    static examples = [
        "<%= config.bin %> conferences:update CF1234567890abcdef --status terminated",
        "<%= config.bin %> conferences:update CF1234567890abcdef --status terminated --dry-run",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Description for this conference. Maximum 64 characters.",
            required: false,
        }),
        playBeep: Flags.string({
            char: "b",
            description:
                "Controls when a beep is played. Valid values: always, never, entryOnly, exitOnly.",
            required: false,
        }),
        status: Flags.string({
            char: "S",
            description: "New status of the conference. Valid values: empty or terminated.",
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

    static args = {
        conferenceId: Args.string({
            description: "String that uniquely identifies this conference resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "conferences",
            commandName: "update",
            endpoint: (args) => `Conferences/${args.conferenceId}`,
            method: "POST",
            quietIdKey: "conferenceId",
            dryRun: true,
            validations: [
                { source: "args", key: "conferenceId", rule: "resourceId" },
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "playBeep", rule: "controlChars" },
                { source: "flags", key: "status", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                alias: flags.alias,
                playBeep: flags.playBeep,
                status: flags.status,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
