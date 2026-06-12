import chalk from "chalk"
import { Page, Next } from "./pages.js"
import { Environment } from "./environment.js"
import { isTTY } from "./ui/theme.js"
import { getOutputFormat } from "./agent-config.js"
import { renderData, RenderDataOptions } from "./ui/ink/renderer.js"
import { getFormatterForTopic } from "./ui/format.js"

type Log = { log(x: string): any }
type DataStore = Log & { config: { dataDir: string } }
export class Output {
    private currentPage?: Page

    private environment: Environment

    private logger: Log

    private commandName: string

    constructor(logger: Log, storePath?: string) {
        let envDir = storePath
        this.logger = logger
        this.commandName = Output.formatCommandNameUnderscores(logger.constructor.name)
        if (logger as DataStore) {
            envDir = (logger as DataStore).config.dataDir
        }
        this.environment = new Environment(envDir)
    }

    out(output: string): void {
        // logger has any type with a function called log that takes a string
        this.logger.log(output)
        this.currentPage = new Page(output)

        if (this.currentPage.next as string) {
            this.environment.setStringPersist(
                `FREECLIMB_${this.commandName}_NEXT`,
                this.currentPage.next as string
            )
            this.logger.log(
                `== Currently on page ${this.currentPage.num}. Run this command again with the -n flag to go to the next page. ==`
            )
        }
    }

    /**
     * Render data using Ink components when in TTY + human mode,
     * otherwise fall back to string-based formatters via out().
     */
    render(data: unknown, options?: { command?: string; topic?: string }): void {
        // Null data = 204 success
        if (data === null || data === undefined) {
            if (isTTY() && getOutputFormat() === "human") {
                renderData(data, options)
            } else {
                this.out(chalk.green("Received a success code from FreeClimb. There is no further output."))
            }
            return
        }

        if (isTTY() && getOutputFormat() === "human") {
            const renderOptions: RenderDataOptions = {
                ...options,
            }

            // Attach pagination info if available
            if (this.currentPage) {
                renderOptions.pageNum = this.currentPage.num
                renderOptions.hasNext = this.currentPage.next !== null
            }

            renderData(data, renderOptions)

            // Track pagination state from data
            const pageStr = JSON.stringify(data)
            this.currentPage = new Page(pageStr)
            if (this.currentPage.next as string) {
                this.environment.setStringPersist(
                    `FREECLIMB_${this.commandName}_NEXT`,
                    this.currentPage.next as string
                )
            }
        } else {
            // Non-TTY fallback: use existing string-based formatters, matching old behavior
            const { topic, command } = options || {}
            const formatter = topic && command ? getFormatterForTopic(topic, command) : null
            if (formatter) {
                this.out(formatter(data))
            } else {
                this.out(JSON.stringify(data, null, 2))
            }
        }
    }

    get next(): Next {
        if (this.currentPage && this.currentPage.next === null) {
            // if at the last page of output
            return null
        }
        const env: string = Environment.getString(`FREECLIMB_${this.commandName}_NEXT`)
        return env === "" ? undefined : env
    }

    private static formatCommandNameUnderscores(name: string) {
        let output = ""
        const tempArray = name.split("")
        tempArray.forEach((letter) => {
            if (letter === letter.toUpperCase()) {
                output += "_"
            }
            output += letter.toUpperCase()
        })
        return output
    }
}
