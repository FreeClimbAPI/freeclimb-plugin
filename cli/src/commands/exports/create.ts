import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class exportsCreate extends Command {
    static description = ` Create a new Export for Calls or Messages within the specified account.`
    static examples = [
        "<%= config.bin %> exports:create --resourceType Calls",
        '<%= config.bin %> exports:create --resourceType Messages --query \'{"status":"completed"}\' --format callId,status',
        "<%= config.bin %> exports:create --resourceType Calls --dry-run",
    ]

    static flags = {
        resourceType: Flags.string({
            char: "r",
            description: "The API resource type to export.",
            required: true,
            options: ["Calls", "Messages"],
        }),
        query: Flags.string({
            char: "q",
            description: "PQL or list query as a JSON object string.",
            required: false,
        }),
        format: Flags.string({
            char: "f",
            description: "Comma-separated list of resource properties to include in the export.",
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
            topic: "exports",
            commandName: "create",
            endpoint: "Exports",
            method: "POST",
            quietIdKey: "exportId",
            dryRun: true,
            validations: [
                { source: "flags", key: "resourceType", rule: "controlChars" },
                { source: "flags", key: "query", rule: "controlChars" },
                { source: "flags", key: "format", rule: "controlChars" },
            ],
            afterParse: (command, _args, flags) => {
                if (!flags.query) return
                try {
                    flags.parsedQuery = JSON.parse(flags.query)
                } catch {
                    command.error("--query is not valid JSON", { exit: 2 })
                }
            },
            buildData: (_args, flags) => {
                const data: Record<string, unknown> = {
                    resourceType: flags.resourceType,
                    output: { type: "csv" },
                }
                if (flags.parsedQuery !== undefined) {
                    data.query = flags.parsedQuery
                }
                if (flags.format) {
                    data.format = flags.format.split(",").map((field: string) => field.trim())
                }
                return data
            },
        }
        await runResourceCommand(this, spec)
    }
}
