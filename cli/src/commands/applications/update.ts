import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class applicationsUpdate extends Command {
    static description = ` Update the properties of the specified application.`
    static examples = [
        '<%= config.bin %> applications:update AP1234567890abcdef1234567890abcdef12345678 --alias "Updated App"',
        "<%= config.bin %> applications:update AP1234567890abcdef1234567890abcdef12345678 --voiceUrl https://example.com/new-voice --dry-run",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description:
                "A human readable description of the application, with maximum length 64 characters.",
            required: false,
        }),
        voiceUrl: Flags.string({
            char: "v",
            description:
                "The URL that FreeClimb will request when an inbound call arrives on a phone number assigned to this application. Used only for inbound calls.",
            required: false,
        }),
        voiceFallbackUrl: Flags.string({
            char: "V",
            description:
                "The URL that FreeClimb will request if it times out waiting for a response from the voiceUrl. Used for inbound calls only. Note: A PerCL response is expected to control the inbound call.",
            required: false,
        }),
        callConnectUrl: Flags.string({
            char: "c",
            description:
                "The URL that FreeClimb will request when an outbound call request is complete. Used for outbound calls only. Note: A PerCL response is expected if the outbound call is connected (status=InProgress) to control the call.",
            required: false,
        }),
        statusCallbackUrl: Flags.string({
            char: "s",
            description:
                "The URL that FreeClimb will request to pass call status (such as call ended) to the application. Note: This is a notification only; any PerCL returned will be ignored.",
            required: false,
        }),
        smsUrl: Flags.string({
            char: "u",
            description:
                "The URL that FreeClimb will request when a phone number assigned to this application receives an incoming SMS message. Used for inbound SMS only. Note: Any PerCL returned will be ignored.",
            required: false,
        }),
        smsFallbackUrl: Flags.string({
            char: "F",
            description:
                "The URL that FreeClimb will request if it times out waiting for a response from the smsUrl. Used for inbound SMS only. Note: Any PerCL returned will be ignored.",
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
        applicationId: Args.string({
            description: "A string that uniquely identifies this application resource.",
            required: true,
        }),
    }

    async run() {
        const spec: CommandSpec = {
            topic: "applications",
            commandName: "update",
            endpoint: (args) => `Applications/${args.applicationId}`,
            method: "POST",
            quietIdKey: "applicationId",
            dryRun: true,
            validations: [
                { source: "args", key: "applicationId", rule: "resourceId" },
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "voiceUrl", rule: "controlChars" },
                { source: "flags", key: "voiceFallbackUrl", rule: "controlChars" },
                { source: "flags", key: "callConnectUrl", rule: "controlChars" },
                { source: "flags", key: "statusCallbackUrl", rule: "controlChars" },
                { source: "flags", key: "smsUrl", rule: "controlChars" },
                { source: "flags", key: "smsFallbackUrl", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                alias: flags.alias,
                voiceUrl: flags.voiceUrl,
                voiceFallbackUrl: flags.voiceFallbackUrl,
                callConnectUrl: flags.callConnectUrl,
                statusCallbackUrl: flags.statusCallbackUrl,
                smsUrl: flags.smsUrl,
                smsFallbackUrl: flags.smsFallbackUrl,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
