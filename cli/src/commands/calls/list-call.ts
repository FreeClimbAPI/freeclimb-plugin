import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callsListCall extends Command {
    static description = ` Retrieve a list of recordings generated during the specified Call.`

    static flags = {
        dateCreated: Flags.string({
            char: "d",
            description:
                "Only show recordings created on the specified date, in the form YYYY-MM-DD.",
            required: false,
        }),
        next: Flags.boolean({ char: "n", description: "Displays the next page of output." }),
        json: Flags.boolean({ description: "Output as JSON (for scripting/agents)", default: false }),
        help: Flags.help({ char: "h" }),
    }

    static args = {
		callId: Args.string({description: "String that uniquely identifies this call resource.", required: false}),
	}

    async run() {
        const spec: CommandSpec = {
            topic: "calls",
            commandName: "list-call",
            endpoint: (args) => `Calls/${args.callId}/Recordings`,
            method: "GET",
            quietIdKey: "recordingId",
            supportsNext: true,
            buildParams: (args, flags) => ({ dateCreated: flags.dateCreated }),
        }
        await runResourceCommand(this, spec)
    }
}
