import { Args, Command, Flags } from "@oclif/core"
import { readFileSync } from "node:fs"
import { isTTY } from "../ui/theme.js"
import { cred } from "../credentials.js"
import type { DashboardSpec, PresetName } from "../dashboard/types.js"
import { PRESET_NAMES, parseDashboardSpec } from "../dashboard/types.js"
import { validateSourceBindings } from "../dashboard/data.js"
import { loadPreset, listPresets } from "../dashboard/presets/index.js"

export class Dashboard extends Command {
    static description = `Launch an AI-driven terminal dashboard for monitoring FreeClimb resources.

Built-in presets: calls, queues, sms, health.
Or provide a custom JSON dashboard spec via --spec.

Examples:
  $ freeclimb dashboard calls
  $ freeclimb dashboard queues --refresh 15
  $ freeclimb dashboard --spec my-dashboard.json
  $ freeclimb dashboard calls --json
  $ freeclimb dashboard health --no-live
`

    static args = {
        preset: Args.string({
            description: "Built-in dashboard preset",
            required: false,
            options: ["calls", "queues", "sms", "health"],
        }),
    }

    static flags = {
        spec: Flags.string({
            description: "Path to a custom JSON dashboard spec file",
            exclusive: ["preset"],
        }),
        refresh: Flags.integer({
            description: "Polling interval in seconds (default: 30, min: 10)",
            default: 30,
        }),
        json: Flags.boolean({
            description: "Output the dashboard spec as JSON instead of rendering",
            default: false,
        }),
        "no-live": Flags.boolean({
            description: "Render once and exit (no polling loop)",
            default: false,
        }),
        list: Flags.boolean({
            description: "List available preset dashboards",
            default: false,
        }),
        help: Flags.help({ char: "h" }),
    }

    static examples = [
        "<%= config.bin %> dashboard calls",
        "<%= config.bin %> dashboard queues --refresh 15",
        "<%= config.bin %> dashboard --spec custom.json",
        "<%= config.bin %> dashboard --list",
    ]

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Dashboard)

        if (flags.list) {
            const presets = listPresets()
            for (const p of presets) {
                this.log(`  ${p.name.padEnd(10)} ${p.description}`)
            }
            return
        }

        // Load the spec
        let spec: DashboardSpec

        if (flags.spec) {
            try {
                const content = readFileSync(flags.spec, "utf-8")
                spec = parseDashboardSpec(JSON.parse(content))
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error)
                this.error(`Failed to load spec from ${flags.spec}: ${msg}`, {
                    exit: 1,
                })
            }
        } else {
            const presetName = (args.preset || "calls") as PresetName
            if (!PRESET_NAMES.includes(presetName)) {
                this.error(`Unknown preset: ${presetName}. Available: ${PRESET_NAMES.join(", ")}`, {
                    exit: 1,
                })
            }
            spec = loadPreset(presetName)
        }

        // Validate data source bindings in the spec
        try {
            validateSourceBindings(spec)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error)
            this.error(msg, { exit: 1 })
        }

        // JSON mode — output spec and exit
        if (flags.json || !isTTY()) {
            this.log(JSON.stringify(spec, null, 2))
            return
        }

        // Verify credentials before launching persistent render
        const accountId = await cred.accountId
        if (!accountId) {
            this.error("Not logged in. Run 'freeclimb login' to authenticate.", { exit: 1 })
        }

        const refreshMs = Math.max(flags.refresh, 10) * 1000

        // Dynamic import to avoid loading Ink/React for JSON-only paths
        const { renderDashboard } = await import("../dashboard/render.js")
        await renderDashboard({
            spec,
            refreshMs,
            once: flags["no-live"],
        })
    }
}
