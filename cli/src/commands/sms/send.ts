import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class smsSend extends Command {
    static description = `This command allows you to send a sms message.`
    static examples = [
        '<%= config.bin %> sms:send +12223334444 +15556667777 "Hello from FreeClimb!"',
        '<%= config.bin %> sms:send +12223334444 +15556667777 "Hello!" --json',
        '<%= config.bin %> sms:send +12223334444 +15556667777 "Test" --dry-run',
    ]

    static flags = {
        notificationUrl: Flags.string({
            char: "n",
            description:
                "When the Message changes status, this URL is invoked using HTTP POST with the messageStatus parameters. Note: This is a notification only; any PerCL returned is ignored.",
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
        from: Args.string({
            description:
                "Phone number to use as the sender. This must be an incoming phone number that you have purchased from FreeClimb.",
            required: true,
        }),
        to: Args.string({
            description:
                "Phone number to receive the message. Must be within FreeClimb's service area. For trial accounts, must be a Verified Number.",
            required: true,
        }),
        text: Args.string({ description: "Text contained in the message.", required: true }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "sms",
            commandName: "send",
            endpoint: "Messages",
            method: "POST",
            quietIdKey: "messageId",
            dryRun: true,
            validations: [
                { source: "args", key: "from", rule: "controlChars" },
                { source: "args", key: "to", rule: "controlChars" },
                { source: "args", key: "text", rule: "controlChars" },
                { source: "flags", key: "notificationUrl", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                from: args.from,
                to: args.to,
                text: args.text,
                notificationUrl: flags.notificationUrl,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
