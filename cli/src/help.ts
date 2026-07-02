import { Command, Help, Interfaces } from "@oclif/core"
import chalk from "chalk"
import { getWelcomeBanner } from "./ui/banner.js"
import { BrandColors, supportsColor } from "./ui/theme.js"
import { getBoxChars } from "./ui/chars.js"

const { bold, cyan, dim, hex } = chalk

const primary = supportsColor() ? hex(BrandColors.orange) : cyan
// eslint-disable-next-line no-control-regex
const ANSI_STRIP = /\u001b\[[0-9;]*m/g

function indent(str: string, count: number): string {
    const pad = " ".repeat(count)
    return str
        .split("\n")
        .map((line) => pad + line)
        .join("\n")
}

function renderList(items: [string, string | undefined][], maxWidth: number): string {
    let longestName = 0
    for (const [name] of items) {
        longestName = Math.max(longestName, name.replace(ANSI_STRIP, "").length)
    }

    const maxNameLen = Math.min(longestName, 30)
    return items
        .map(([name, desc]) => {
            const stripped = name.replace(ANSI_STRIP, "")
            const padding = " ".repeat(Math.max(1, maxNameLen - stripped.length + 2))
            const line = `${name}${padding}${desc || ""}`
            return line
        })
        .join("\n")
}

export default class FreeClimbHelpClass extends Help {
    showRootHelp(): Promise<void> {
        console.log(getWelcomeBanner())
        return Promise.resolve()
    }

    protected formatTopics(topics: Interfaces.Topic[]): string {
        if (topics.length === 0) return ""

        const coreTopics = ["calls", "sms", "applications", "incoming-numbers"]
        const accountTopics = ["accounts", "logs"]
        const advancedTopics = [
            "conferences",
            "conference-participants",
            "call-queues",
            "queue-members",
            "recordings",
            "available-numbers",
        ]
        const integrationTopics = ["mcp"]
        const allKnown = new Set([...coreTopics, ...accountTopics, ...advancedTopics, ...integrationTopics])

        const categorizedTopics = {
            "Core Commands": topics.filter((t) => coreTopics.includes(t.name)),
            "Account & Logs": topics.filter((t) => accountTopics.includes(t.name)),
            "Advanced Features": topics.filter((t) => advancedTopics.includes(t.name)),
            Integrations: topics.filter((t) => integrationTopics.includes(t.name)),
            Other: topics.filter((t) => !allKnown.has(t.name)),
        }

        let output = ""
        const chars = getBoxChars()

        for (const [category, categoryTopics] of Object.entries(categorizedTopics)) {
            if (categoryTopics.length === 0) continue

            const body = renderList(
                categoryTopics.map((c) => [
                    primary(c.name),
                    c.description ? this.render(c.description.split("\n")[0]) : undefined,
                ]),
                80,
            )

            const categoryHeader = `${chars.teeRight}${chars.horizontal} ${primary(category.toUpperCase())} ${chars.horizontal.repeat(Math.max(0, 30 - category.length))}${chars.teeLeft}`

            output += `\n${categoryHeader}\n`
            output += indent(body, 2)
            output += "\n"
        }

        output += `\n${dim("To learn about the available commands in a topic, type:")}\n`
        output += indent(`$ ${primary("freeclimb [TOPIC]")}`, 2)
        output += "\n"

        return output
    }

    protected formatCommands(commands: Array<Command.Loadable>): string {
        if (commands.length === 0) return ""

        const chars = getBoxChars()

        const body = renderList(
            commands.map((c) => {
                const description = c.description ? c.description.split("\n")[0] : ""
                return [primary(c.id), description] as [string, string]
            }),
            80,
        )

        const header = `${chars.topLeft}${chars.horizontal} ${primary("COMMANDS")} ${chars.horizontal.repeat(20)}${chars.topRight}`

        return [header, indent(body, 2)].join("\n")
    }
}
