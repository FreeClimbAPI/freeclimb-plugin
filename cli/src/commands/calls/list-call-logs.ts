import { Args, Command, Flags } from "@oclif/core"
import { CommandSpec, runResourceCommand } from "../../executor.js"

export class callsListCallLogs extends Command {
    static description = ` Retrieve all logs associated with the specified Call.`

    static flags = {
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
            commandName: "list-call-logs",
            endpoint: (args) => `Calls/${args.callId}/Logs`,
            method: "GET",
            quietIdKey: "callId",
            supportsNext: true,
        }
        await runResourceCommand(this, spec)
    }
}
