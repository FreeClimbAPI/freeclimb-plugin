import { Args, Command, Flags } from "@oclif/core"
import { writeFileSync } from "node:fs"
import { apiRequest } from "@freeclimb/core"
import { getOutputFormat } from "../../agent-config.js"
import * as Errors from "../../errors.js"
import { handleCommandError } from "../../executor.js"
import { Output } from "../../output.js"
import { wrapJsonOutput } from "../../ui/format.js"
import { validateResourceId } from "../../validation.js"

export class exportsDownload extends Command {
    static description = ` Download an Export file to disk. Authentication is required, as with any other request made to the REST API.`
    static examples = [
        "<%= config.bin %> exports:download EX1234567890abcdef",
        "<%= config.bin %> exports:download EX1234567890abcdef --output my-export.csv",
        "<%= config.bin %> exports:download EX1234567890abcdef --json",
    ]

    static flags = {
        output: Flags.string({
            char: "o",
            description: "Path to write the downloaded export file.",
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
        fields: Flags.string({ hidden: true }),
        help: Flags.help({ char: "h" }),
    }

    static args = {
        exportId: Args.string({
            description: "String that uniquely identifies this Export resource.",
            required: true,
        }),
    }

    async run() {
        const out = new Output(this)
        const { args, flags } = await this.parse(exportsDownload)
        const outputFormat = getOutputFormat(flags.json)
        validateResourceId(args.exportId, "exportId")

        if (flags.next) {
            const error = new Errors.NoNextPage()
            this.error(error.message, { exit: error.code })
        }

        const outputPath = flags.output ?? `export-${args.exportId}.csv`
        const endpoint = `Exports/${args.exportId}/Download`

        try {
            const response = await apiRequest<string | Buffer>({
                method: "GET",
                path: `/${endpoint}`,
            })
            if (response.status === 204) {
                if (flags.quiet) return
                if (outputFormat === "json") {
                    out.out(
                        JSON.stringify(
                            wrapJsonOutput(null, {
                                command: "exports:download",
                                request: { method: "GET", endpoint },
                            }),
                            null,
                            2,
                        ),
                    )
                } else {
                    out.out("Received a success code from FreeClimb. There is no further output.")
                }
                return
            }
            if (response.data === undefined || response.data === null) {
                throw new Errors.UndefinedResponseError()
            }
            const content =
                typeof response.data === "string" ? response.data : Buffer.from(response.data)
            writeFileSync(outputPath, content)
            if (flags.quiet) {
                out.out(outputPath)
                return
            }
            if (outputFormat === "json") {
                out.out(
                    JSON.stringify(
                        wrapJsonOutput({ exportId: args.exportId, output: outputPath }),
                        null,
                        2,
                    ),
                )
            } else {
                out.out(`Downloaded export to ${outputPath}`)
            }
        } catch (error) {
            handleCommandError(this, error)
        }
    }
}
