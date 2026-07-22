import { validatePercl, type PerclValidationResult } from "@freeclimb/core"
import { Args, Command, Flags } from "@oclif/core"
import { readFile } from "node:fs/promises"

async function readStdin(): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks).toString("utf8")
}

export class PerclValidate extends Command {
    static args = {
        file: Args.string({
            description: "Path to a PerCL JSON file, or - to read stdin",
            required: true,
        }),
    }

    static description = "Validate PerCL JSON without authentication or API calls"

    static examples = [
        "<%= config.bin %> <%= command.id %> flow.percl.json",
        "cat flow.percl.json | <%= config.bin %> <%= command.id %> - --json",
    ]

    static flags = {
        help: Flags.help({ char: "h" }),
        json: Flags.boolean({
            description: "Output structured validation results",
            default: false,
        }),
    }

    async run(): Promise<PerclValidationResult> {
        const { args, flags } = await this.parse(PerclValidate)
        let result: PerclValidationResult

        try {
            const input = args.file === "-" ? await readStdin() : await readFile(args.file, "utf8")
            result = validatePercl(JSON.parse(input))
        } catch (error) {
            result = {
                valid: false,
                errors: [error instanceof Error ? error.message : String(error)],
                warnings: [],
            }
        }

        if (flags.json) {
            this.log(JSON.stringify(result))
        } else if (result.valid) {
            this.log("PerCL is valid.")
        } else {
            this.log("PerCL is invalid.")
            for (const error of result.errors) this.log(`- ${error}`)
            for (const warning of result.warnings) this.log(`- ${warning}`)
        }

        if (!result.valid || result.warnings.length > 0) this.exit(1)
        return result
    }
}
