import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class applicationsCreate extends Command {
    static description = ` Create a new Application within the specified account.`
    static examples = [
        '<%= config.bin %> applications:create --alias "My App" --voiceUrl https://example.com/voice',
        "<%= config.bin %> applications:create --json",
        "<%= config.bin %> applications:create --dry-run --alias test",
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "Description of the new application (maximum 64 characters).",
            required: false,
        }),
        voiceUrl: Flags.string({
            char: "v",
            description:
                "URL that FreeClimb should request when an inbound call arrives on a phone number assigned to this application. Used only for inbound calls. Note: A PerCL response is expected to control the inbound call.",
            required: false,
        }),
        voiceFallbackUrl: Flags.string({
            char: "V",
            description:
                "URL that FreeClimb will request if it times out waiting for a response from the voiceUrl. Used for inbound calls only. Note: A PerCL response is expected to control the inbound call.",
            required: false,
        }),
        callConnectUrl: Flags.string({
            char: "c",
            description:
                "URL that FreeClimb will request when an outbound call request is complete. Used for outbound calls only. Note: A PerCL response is expected if the outbound call is connected (status=InProgress) to control the call.",
            required: false,
        }),
        statusCallbackUrl: Flags.string({
            char: "s",
            description:
                "URL that FreeClimb will request to pass call status (such as call ended) to the application. Note: This is a notification only; any PerCL returned will be ignored.",
            required: false,
        }),
        smsUrl: Flags.string({
            char: "u",
            description:
                "URL that FreeClimb will request when a phone number assigned to this application receives an incoming SMS message. Used for inbound SMS only. Note: Any PerCL returned will be ignored.",
            required: false,
        }),
        smsFallbackUrl: Flags.string({
            char: "F",
            description:
                "URL that FreeClimb will request if it times out waiting for a response from the smsUrl. Used for inbound SMS only. Note: Any PerCL returned will be ignored.",
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
            topic: "applications",
            commandName: "create",
            endpoint: "Applications",
            method: "POST",
            quietIdKey: "applicationId",
            dryRun: true,
            validations: [
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
