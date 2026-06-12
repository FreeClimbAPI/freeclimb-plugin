import { Args, Command, Flags, Interfaces } from "@oclif/core"
import { getOutputFormat } from "../agent-config.js"

interface CommandSchema {
    args: Array<{
        description: string
        name: string
        required: boolean
    }>
    command: string
    description: string
    flags: Record<
        string,
        {
            char?: string
            default?: unknown
            description: string
            options?: string[]
            required: boolean
            type: string
        }
    >
}

interface TopicSchema {
    commands: string[]
    description: string
    topic: string
}

export class Describe extends Command {
    static description = `Describe available commands, flags, and arguments as machine-readable JSON.

Use this command for runtime schema introspection. AI agents can call this
to discover what the CLI accepts without parsing --help output.

Examples:
  freeclimb describe                   # List all topics
  freeclimb describe calls             # Show commands in the calls topic
  freeclimb describe calls:list        # Full schema for calls:list
  freeclimb describe --all             # Full schema for every command
`

    static args = {
        // eslint-disable-next-line camelcase
        command_or_topic: Args.string({
            description: "Command (e.g. calls:list) or topic (e.g. calls) to describe",
            required: false,
        }),
    }

    static flags = {
        all: Flags.boolean({
            description: "Show full schema for all commands",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    async run() {
        const { args, flags: parsedFlags } = await this.parse(Describe)
        const { commands } = this.config
        const topics = this.getTopics()

        if (parsedFlags.all) {
            const allSchemas = commands
                .filter((c) => !c.hidden && c.id !== "describe")
                .map((c) => this.commandToSchema(c))
            this.log(JSON.stringify(allSchemas, null, 2))
            return
        }

        if (!args.command_or_topic) {
            const topicSchemas: TopicSchema[] = topics.map((t) => ({
                topic: t.name,
                description: (t.description || "").trim(),
                commands: commands
                    .filter((c) => c.id.startsWith(t.name + ":") || c.id === t.name)
                    .filter((c) => !c.hidden)
                    .map((c) => c.id),
            }))
            this.log(JSON.stringify(topicSchemas, null, 2))
            return
        }

        const input = args.command_or_topic

        const exactCommand = commands.find((c) => c.id === input)
        if (exactCommand) {
            this.log(JSON.stringify(this.commandToSchema(exactCommand), null, 2))
            return
        }

        const topicCommands = commands
            .filter((c) => c.id.startsWith(input + ":"))
            .filter((c) => !c.hidden)

        if (topicCommands.length > 0) {
            const topic = topics.find((t) => t.name === input)
            const result = {
                topic: input,
                description: topic?.description?.trim() || "",
                commands: topicCommands.map((c) => this.commandToSchema(c)),
            }
            this.log(JSON.stringify(result, null, 2))
            return
        }

        this.error(`Unknown command or topic: ${input}`, { exit: 1 })
    }

    private getTopics(): Interfaces.Topic[] {
        const topicMap = new Map<string, Interfaces.Topic>()
        for (const cmd of this.config.commands) {
            const parts = cmd.id.split(":")
            if (parts.length > 1) {
                const topicName = parts[0]
                if (!topicMap.has(topicName)) {
                    topicMap.set(topicName, {
                        name: topicName,
                        description:
                            (this.config as any).pjson?.oclif?.topics?.[topicName]?.description ||
                            "",
                    })
                }
            }
        }
        return [...topicMap.values()].sort((a, b) => a.name.localeCompare(b.name))
    }

    private commandToSchema(cmd: Command.Loadable): CommandSchema {
        const schema: CommandSchema = {
            command: cmd.id,
            description: (cmd.description || "").trim(),
            flags: {},
            args: [],
        }

        if (cmd.flags) {
            for (const [name, flag] of Object.entries(cmd.flags)) {
                if (name === "help") continue
                const f = flag as any
                schema.flags[name] = {
                    type: f.type || "string",
                    required: Boolean(f.required),
                    description: (f.description || "").trim(),
                }
                if (f.options) {
                    schema.flags[name].options = f.options
                }
                if (f.char) {
                    schema.flags[name].char = f.char
                }
                if (f.default !== undefined) {
                    schema.flags[name].default = f.default
                }
            }
        }

        if (cmd.args) {
            for (const [name, arg] of Object.entries(cmd.args)) {
                schema.args.push({
                    name,
                    required: Boolean((arg as any).required),
                    description: ((arg as any).description || "").trim(),
                })
            }
        }

        return schema
    }
}
