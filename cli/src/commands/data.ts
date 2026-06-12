import { Args, Command, Flags } from "@oclif/core"

export class data extends Command {
    static description = `Find your data directory. You can store your credentials here in a .env file, after setting permissions appropriately. See https://oclif.io/docs/config for how to change this location.`

    static flags = {
        help: Flags.help({ char: "h" }),
    }

    async run() {
        await this.parse(data)
        this.log(`FreeClimb CLI Data directory: ${this.config.dataDir}`)
        return this.config.dataDir
    }
}
