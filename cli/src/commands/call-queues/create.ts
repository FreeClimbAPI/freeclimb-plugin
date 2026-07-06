import { Command, Flags } from "@oclif/core"
import * as Errors from "../../errors.js"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callQueuesCreate extends Command {
    static description = ` Create a Queue within the specified account.`
    static examples = [
        '<%= config.bin %> call-queues:create --alias "Support Queue"',
        '<%= config.bin %> call-queues:create --alias "Support Queue" --maxSize 100 --dry-run',
    ]

    static flags = {
        alias: Flags.string({
            char: "a",
            description: "A description for this Queue. Max length is 64 characters.",
            required: false,
        }),
        maxSize: Flags.integer({
            char: "M",
            description:
                "Maximum number of Calls this queue can hold. Default is 1000. Maximum is 1000.",
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
        const { flags } = await this.parse(callQueuesCreate)
        const belowRangeError = new Errors.OutOfRange("maxSize", 0, "greater")
        const aboveRangeError = new Errors.OutOfRange("maxSize", 1000, "less")
        if (flags.maxSize && flags.maxSize < 0) {
            this.error(belowRangeError.message, { exit: belowRangeError.code })
        }
        if (flags.maxSize && flags.maxSize > 1000) {
            this.error(aboveRangeError.message, { exit: aboveRangeError.code })
        }
        const spec: CommandSpec = {
            topic: "call-queues",
            commandName: "create",
            endpoint: "Queues",
            method: "POST",
            quietIdKey: "queueId",
            dryRun: true,
            validations: [{ source: "flags", key: "alias", rule: "controlChars" }],
            buildData: (args, flags) => ({
                alias: flags.alias,
                maxSize: flags.maxSize,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
