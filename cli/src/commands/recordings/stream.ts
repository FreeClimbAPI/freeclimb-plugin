import { Args, Command, Flags } from "@oclif/core"
import { apiRequest } from "@freeclimb/core"
import { getOutputFormat } from "../../agent-config.js"
import * as Errors from "../../errors.js"
import { handleCommandError } from "../../executor.js"
import { Output } from "../../output.js"
import { wrapJsonOutput } from "../../ui/format.js"
import { extractQuietIds, filterFieldsDeep, validateResourceId } from "../../validation.js"

export class recordingsStream extends Command {
    static description = ` Stream a Recording File. Authentication is required to stream a Recording, as with any other request made to the REST API.`
    static examples = [
        "<%= config.bin %> recordings:stream RE1234567890abcdef",
        "<%= config.bin %> recordings:stream RE1234567890abcdef --json",
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
        help: Flags.help({ char: "h" }),
    }

    static args = {
        recordingId: Args.string({
            description: "String that uniquely identifies this recording resource.",
            required: true,
        }),
    }

    async run() {
        const out = new Output(this)
        const { args, flags } = await this.parse(recordingsStream)
        const outputFormat = getOutputFormat(flags.json)
        validateResourceId(args.recordingId, "recordingId")

        if (flags.next) {
            const error = new Errors.NoNextPage()
            this.error(error.message, { exit: error.code })
        }

        const endpoint = `Recordings/${args.recordingId}/Stream`
        const formatOutput = (data: unknown) => {
            const outputData = flags.fields
                ? filterFieldsDeep(
                      data,
                      flags.fields.split(",").map((f: string) => f.trim()),
                  )
                : data
            if (outputFormat === "json") {
                return JSON.stringify(wrapJsonOutput(outputData), null, 2)
            }
            out.render(outputData, { topic: "recordings", command: "stream" })
            return null
        }

        try {
            const response = await apiRequest({
                method: "GET",
                path: `/${endpoint}`,
            })
            if (response.status === 204) {
                if (flags.quiet) return
                if (outputFormat === "json") {
                    out.out(
                        JSON.stringify(
                            wrapJsonOutput(null, {
                                command: "recordings:stream",
                                request: { method: "GET", endpoint },
                            }),
                            null,
                            2,
                        ),
                    )
                } else {
                    out.render(null, { topic: "recordings", command: "stream" })
                }
            } else if (response.data) {
                if (flags.quiet) {
                    const ids = extractQuietIds(response.data, "recordingId")
                    if (ids) out.out(ids)
                    return
                }
                const result = formatOutput(response.data)
                if (result !== null) out.out(result)
            } else {
                throw new Errors.UndefinedResponseError()
            }
        } catch (error) {
            handleCommandError(this, error)
        }
    }
}
