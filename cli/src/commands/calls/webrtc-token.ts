import { Command, Flags } from "@oclif/core"
import { apiRequest } from "@freeclimb/core"
import { getOutputFormat } from "../../agent-config.js"
import { handleCommandError } from "../../executor.js"
import { Output } from "../../output.js"
import { wrapJsonOutput } from "../../ui/format.js"
import { rejectControlChars, validatePhoneNumber } from "../../validation.js"

export class callsWebrtcToken extends Command {
    static description = ` Create a short-lived WebRTC token for browser-based calling. The token is sensitive and expires quickly; treat it like a credential and do not log or share it.`
    static examples = [
        "<%= config.bin %> calls:webrtc-token --to +15551234567 --from +15557654321",
        "<%= config.bin %> calls:webrtc-token --to +15551234567 --from +15557654321 --uses 3 --json",
    ]

    static flags = {
        to: Flags.string({
            char: "T",
            description: "Destination phone number in E.164 format.",
            required: true,
        }),
        from: Flags.string({
            char: "f",
            description: "Caller ID phone number in E.164 format.",
            required: true,
        }),
        uses: Flags.integer({
            char: "u",
            description: "Number of times the token may be used.",
            default: 1,
        }),
        next: Flags.boolean({ hidden: true }),
        json: Flags.boolean({
            description:
                "Output as a structured JSON envelope with request metadata. Also enabled globally via FREECLIMB_OUTPUT_FORMAT=json.",
            default: false,
        }),
        quiet: Flags.boolean({ hidden: true }),
        fields: Flags.string({ hidden: true }),
        help: Flags.help({ char: "h" }),
    }

    async run() {
        const out = new Output(this)
        const { flags } = await this.parse(callsWebrtcToken)
        const outputFormat = getOutputFormat(flags.json)

        rejectControlChars(flags.to, "to")
        rejectControlChars(flags.from, "from")
        validatePhoneNumber(flags.to, "to")
        validatePhoneNumber(flags.from, "from")

        const body = {
            to: flags.to,
            from: flags.from,
            uses: flags.uses ?? 1,
        }

        try {
            const response = await apiRequest<string>({
                method: "POST",
                path: "/Calls/WebRTC/Token",
                data: body,
            })
            const token = response.data
            if (outputFormat === "json") {
                out.out(JSON.stringify(wrapJsonOutput({ token }), null, 2))
            } else {
                out.out(String(token))
            }
        } catch (error) {
            handleCommandError(this, error)
        }
    }
}
