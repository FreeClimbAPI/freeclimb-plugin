import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferencesCreate extends Command {
    static description = ` Create an empty Conference within the specified account.`
    static examples = [
        '<%= config.bin %> conferences:create --alias "Team Standup"',
        "<%= config.bin %> conferences:create --json --dry-run",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "A description for this Conference. Maximum 64 characters.",
            required: false,
        }),
        playBeep: Flags.string({
            char: "b",
            description:
                "Controls when a beep is played. Valid values: always, never, entryOnly, exitOnly.",
            required: false,
        }),
        record: Flags.string({
            char: "r",
            description: "Setting to true records the entire Conference.",
            required: false,
            options: ["true", "false"],
        }),
        waitUrl: Flags.string({
            char: "w",
            description:
                "If specified, a URL for the audio file that provides custom hold music for the Conference when it is in the populated state. Otherwise, FreeClimb uses a system default audio file. This is always fetched using HTTP GET and is fetched just once - when the Conference is created.",
            required: false,
        }),
        statusCallbackUrl: Flags.string({
            char: "s",
            description: "This URL is invoked when the status of the Conference changes.",
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
            topic: "conferences",
            commandName: "create",
            endpoint: "Conferences",
            method: "POST",
            quietIdKey: "conferenceId",
            dryRun: true,
            validations: [
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "playBeep", rule: "controlChars" },
                { source: "flags", key: "waitUrl", rule: "controlChars" },
                { source: "flags", key: "statusCallbackUrl", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                alias: flags.alias,
                playBeep: flags.playBeep,
                record: typeof flags.record === "undefined" ? undefined : flags.record === "true",
                waitUrl: flags.waitUrl,
                statusCallbackUrl: flags.statusCallbackUrl,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
