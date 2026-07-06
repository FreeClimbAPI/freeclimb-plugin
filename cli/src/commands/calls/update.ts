import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callsUpdate extends Command {
    static description = ` Call hang up may take time. A 202 status code is returned if the hangup request was successfully queued by FreeClimb. Otherwise, an error code is returned. If successfully queued, the asynchronous callback for the result will occur after some time through the statusCallbackUrl.`
    static examples = [
        "<%= config.bin %> calls:update CA1234567890abcdef --status completed",
        "<%= config.bin %> calls:update CA1234567890abcdef --status completed --dry-run",
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
        help: Flags.help({ char: "h" }),
    }

    static args = {
        callId: Args.string({
            description: "String that uniquely identifies this call resource.",
            required: true,
        }),
        status: Args.string({
            description:
                "Either canceled or completed. Specifying canceled attempts to hang up calls that are queued without affecting calls already in progress. Specifying completed attempts to hang up a call already in progress.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "calls",
            commandName: "update",
            endpoint: (args) => `Calls/${args.callId}`,
            method: "POST",
            quietIdKey: "callId",
            dryRun: true,
            validations: [
                { source: "args", key: "callId", rule: "resourceId" },
                { source: "args", key: "status", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({ status: args.status }),
        }
        await runResourceCommand(this, spec)
    }
}
