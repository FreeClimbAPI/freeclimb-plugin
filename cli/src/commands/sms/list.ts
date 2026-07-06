import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class smsList extends Command {
    static description = ` Retrieve a list of SMS Messages made to and from the specified Account, sorted from latest created to oldest.`
    static examples = [
        "<%= config.bin %> sms:list",
        "<%= config.bin %> sms:list --json",
        "<%= config.bin %> sms:list --quiet",
        "<%= config.bin %> sms:list --fields messageId,from,to,status",
    ]

    static flags = {
        to: Flags.string({
            char: "T",
            description: "Only show Messages to this phone number.",
            required: false,
        }),
        from: Flags.string({
            char: "f",
            description: "Only show Messages from this phone number.",
            required: false,
        }),
        beginTime: Flags.string({
            char: "b",
            description:
                "Only show Messages sent at or after this time (GMT), given as YYYY-MM-DD hh:mm:ss.",
            required: false,
        }),
        endTime: Flags.string({
            char: "e",
            description:
                "Only show messages sent at or before this time (GMT), given as YYYY-MM-DD hh:mm.",
            required: false,
        }),
        direction: Flags.string({
            char: "d",
            description:
                "Either inbound or outbound. Only show Messages that were either sent from or received by FreeClimb.",
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
            topic: "sms",
            commandName: "list",
            endpoint: "Messages",
            method: "GET",
            quietIdKey: "messageId",
            supportsNext: true,
            validations: [
                { source: "flags", key: "to", rule: "controlChars" },
                { source: "flags", key: "from", rule: "controlChars" },
                { source: "flags", key: "beginTime", rule: "controlChars" },
                { source: "flags", key: "endTime", rule: "controlChars" },
                { source: "flags", key: "direction", rule: "controlChars" },
            ],
            buildParams: (args, flags) => ({
                to: flags.to,
                from: flags.from,
                beginTime: flags.beginTime,
                endTime: flags.endTime,
                direction: flags.direction,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
