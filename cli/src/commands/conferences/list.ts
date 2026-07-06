import { Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class conferencesList extends Command {
    static description = ` Retrieve a list of Conferences associated with the specified account, sorted by creation date, newest to oldest.`
    static examples = [
        "<%= config.bin %> conferences:list",
        "<%= config.bin %> conferences:list --status inProgress --json",
        "<%= config.bin %> conferences:list --quiet",
    ]

    static flags = {
        status: Flags.string({
            char: "S",
            description:
                "Only show conferences that currently have the specified status. Valid values: empty, populated, inProgress, or terminated.",
            required: false,
        }),
        alias: Flags.string({
            char: "a",
            description: "List Conferences whose alias exactly matches this string.",
            required: false,
        }),
        dateCreated: Flags.string({
            char: "d",
            description:
                "Only show Conferences that were created on the specified date, in the form YYYY-MM-DD.",
            required: false,
        }),
        dateUpdated: Flags.string({
            char: "D",
            description:
                "Only show Conferences that were last updated on the specified date, in the form YYYY-MM-DD.",
            required: false,
        }),
        next: Flags.boolean({ char: "n", description: "Displays the next page of output." }),
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

    async run() {
        const spec: CommandSpec = {
            topic: "conferences",
            commandName: "list",
            endpoint: "Conferences",
            method: "GET",
            quietIdKey: "conferenceId",
            supportsNext: true,
            validations: [
                { source: "flags", key: "status", rule: "controlChars" },
                { source: "flags", key: "alias", rule: "controlChars" },
                { source: "flags", key: "dateCreated", rule: "controlChars" },
                { source: "flags", key: "dateUpdated", rule: "controlChars" },
            ],
            buildParams: (args, flags) => ({
                status: flags.status,
                alias: flags.alias,
                dateCreated: flags.dateCreated,
                dateUpdated: flags.dateUpdated,
            }),
        }
        await runResourceCommand(this, spec)
    }
}
