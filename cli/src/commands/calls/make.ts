import { Args, Command, Flags } from "@oclif/core"
import * as Errors from "../../errors.js"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callsMake extends Command {
    static description = ` Making a Call may take time. A 202 status code is returned if the Call request was successfully queued by FreeClimb, otherwise, a 500 error is returned. The asynchronous callback for the result will occur after some time through the callConnectUrl.`
    static examples = [
        "<%= config.bin %> calls:make +12223334444 +15556667777 AP1234567890abcdef1234567890abcdef12345678 https://example.com/voice",
        "<%= config.bin %> calls:make +12223334444 +15556667777 AP1234567890abcdef1234567890abcdef12345678 https://example.com/voice --dry-run",
    ]

    static flags = {
        callConnectUrl: Flags.string({
            char: "c",
            description:
                "The URL that FreeClimb should use to handle this phone call. If an applicationId or parentCallId have already been provided, this callConnectUrl attribute will be used as a replacement of the callConnectUrl originally assigned in the application or parent call.",
            required: false,
        }),
        parentCallId: Flags.string({
            char: "P",
            description:
                "Required if no applicationId or callConnecturl have been provided. The ID of the parent Call in the case that this new Call is meant to be treated as a child of an existing Call. This attribute should be included when possible to reduce latency when adding child calls to Conferences containing the parent Call. A call can only be used as a parent once the call is in progress or as an inbound call that is still ringing. An outbound call is considered to be in progress once the outdialConnect or outdialApiConnect webhook is invoked. An inbound call is ringing when the inbound webhook is invoked. If a callConnectUrl attribute is also included with the parentCallId in the request, this URL will be used as a replacement of the callConnectUrl originally assigned in the parent call.",
            required: false,
        }),
        sendDigits: Flags.string({
            char: "s",
            description:
                "String of digits to dial after connecting to the number. It can include digits 0-9, *, and #, and allows embedding a pause between the output of individual digits. The default pause is 500 milliseconds. So, a string such as 1234# will be played in 2 seconds because of the 4 standard pauses implied within the string. A custom pause is specified by including a positive integer wrapped in curly braces: {n}.",
            required: false,
        }),
        ifMachine: Flags.string({
            char: "i",
            description:
                "Specifies how FreeClimb should handle this Call if an answering machine answers it.",
            required: false,
        }),
        ifMachineUrl: Flags.string({
            char: "I",
            description:
                "This attribute specifies a URL to which FreeClimb will make a POST request when an answering machine or a fax machine is detected. This URL is required if the ifMachine flag is set to redirect. When ifMachine is set to hangup, ifMachineUrl must not be included in the request.",
            required: false,
        }),
        timeout: Flags.integer({
            char: "t",
            description:
                "Number of seconds that FreeClimb should allow the phone to ring before assuming there is no answer. Default is 30 seconds. Maximum allowed ring-time is determined by the target phone's provider. Note that most providers limit ring-time to 120 seconds.",
            required: false,
        }),
        privacyMode: Flags.string({
            char: "p",
            description:
                "Indicates if the request contains sensitive information which should be hidden. When set to true, the contents of the sendDigits field will be replaced with the string XXXXX in the logs.",
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
        from: Args.string({
            description:
                "Phone number to use as the caller ID. This can be: (a) The To or From number provided in FreeClimb's initial request to your app or (b) Any incoming phone number you have purchased from FreeClimb.",
            required: true,
        }),
        to: Args.string({
            description:
                "Phone number to place the Call to. For trial accounts, this must be a Verified Number.",
            required: true,
        }),
        applicationId: Args.string({
            description:
                "ID of the application FreeClimb should use to handle this phone call. FreeClimb will use the callConnectUrl and statusCallbackUrl set on the application unless the callConnectUrl attribute is also provided with the request. In this case, the URL specified in that callConnectUrl attribute will be used as a replacement of the callConnectUrl originally assigned in the application. The application must have a callConnectUrl associated with it or an error will be returned. The application’s voiceUrl parameter is not used for outbound calls.",
            required: true,
        }),
    }

    async run() {
        const { flags } = await this.parse(callsMake)
        const belowRangeError = new Errors.OutOfRange("timeout", 0, "greater")
        const aboveRangeError = new Errors.OutOfRange("timeout", 120, "less")
        if (flags.timeout && flags.timeout < 0) {
            this.error(belowRangeError.message, { exit: belowRangeError.code })
        }
        if (flags.timeout && flags.timeout > 120) {
            this.error(aboveRangeError.message, { exit: aboveRangeError.code })
        }
        const spec: CommandSpec = {
            topic: "calls",
            commandName: "make",
            endpoint: "Calls",
            method: "POST",
            quietIdKey: "callId",
            dryRun: true,
            validations: [
                { source: "args", key: "applicationId", rule: "resourceId" },
                { source: "flags", key: "parentCallId", rule: "resourceId" },
                { source: "args", key: "from", rule: "controlChars" },
                { source: "args", key: "to", rule: "controlChars" },
                { source: "flags", key: "callConnectUrl", rule: "controlChars" },
                { source: "flags", key: "sendDigits", rule: "controlChars" },
                { source: "flags", key: "ifMachine", rule: "controlChars" },
                { source: "flags", key: "ifMachineUrl", rule: "controlChars" },
            ],
            buildData: (args, flags) => ({
                from: args.from,
                to: args.to,
                applicationId: args.applicationId,
                callConnectUrl: flags.callConnectUrl,
                parentCallId: flags.parentCallId,
                sendDigits: flags.sendDigits,
                ifMachine: flags.ifMachine,
                ifMachineUrl: flags.ifMachineUrl,
                timeout: flags.timeout,
                privacyMode:
                    typeof flags.privacyMode === "undefined" ? undefined : flags.privacyMode === "true",
            }),
        }
        await runResourceCommand(this, spec)
    }
}
