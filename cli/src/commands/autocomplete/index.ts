import { Args, Command, Flags } from "@oclif/core"

export class CustomAutocomplete extends Command {
    static description = "Display autocomplete installation instructions"

    static flags = {
        help: Flags.help({ char: "h" }),
    }

    async run() {
        await this.parse(CustomAutocomplete)
        this.log(
            "Copy the following line and run it in your terminal. It will set the FreeClimb CLI autocomplete to load on shell startup."
        )
        this.log(
            `\nRun \`freeclimb autocomplete bash\` or \`freeclimb autocomplete zsh\` for shell-specific setup instructions.`
        )
    }
}
