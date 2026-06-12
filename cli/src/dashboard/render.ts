import React from "react"
import { render, Box } from "ink"
import { JSONUIProvider } from "@json-render/ink"
import type { StateStore, Spec } from "@json-render/core"
import { createStateStore } from "@json-render/core"
import { getTerminalWidth } from "../ui/theme.js"
import { TerminalWidthProvider } from "../ui/ink/terminal-context.js"
import { FreeclimbRenderer } from "./catalog.js"
import { DashboardDataManager } from "./data.js"
import type { DashboardSpec } from "./types.js"

const RENDER_SETTLE_MS = 100

interface DashboardAppProps {
    spec: DashboardSpec
    store: StateStore
    width: number
}

function DashboardApp({ spec, store, width }: DashboardAppProps): React.ReactElement {
    return React.createElement(
        TerminalWidthProvider,
        { value: width },
        React.createElement(
            Box,
            { flexDirection: "column", width },
            React.createElement(FreeclimbRenderer, {
                spec: spec as unknown as Spec,
                store,
            }),
        ),
    )
}

export interface RenderOptions {
    once?: boolean
    refreshMs: number
    spec: DashboardSpec
}

export async function renderDashboard({ spec, refreshMs, once }: RenderOptions): Promise<void> {
    const width = getTerminalWidth()
    const stateStore = createStateStore(spec.state || {})

    const dataManager = new DashboardDataManager(
        (updates) => {
            for (const { path, value } of updates) {
                stateStore.set(path, value)
            }
        },
        (source, error) => {
            process.stderr.write(`[dashboard] ${source} error: ${error.message}\n`)
        },
    )

    const appElement = React.createElement(DashboardApp, { spec, store: stateStore, width })
    const instance = render(
        React.createElement(JSONUIProvider, { store: stateStore, children: appElement }),
    )

    const cleanup = () => {
        dataManager.stop()
        instance.unmount()
    }

    process.once("SIGINT", () => {
        cleanup()
        process.exit(0)
    })

    process.once("SIGTERM", () => {
        cleanup()
        process.exit(0)
    })

    if (once) {
        try {
            await dataManager.start(spec, refreshMs)
            await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS))
        } finally {
            cleanup()
        }
    } else {
        await dataManager.start(spec, refreshMs)
        await instance.waitUntilExit()
    }
}
