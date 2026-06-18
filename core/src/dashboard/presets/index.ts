import type { DashboardSpec, PresetName } from "../types.js"
import callOverview from "./call-overview.json" with { type: "json" }
import queueMonitor from "./queue-monitor.json" with { type: "json" }
import smsActivity from "./sms-activity.json" with { type: "json" }
import systemHealth from "./system-health.json" with { type: "json" }

const PRESETS: Record<PresetName, DashboardSpec> = {
    calls: callOverview as unknown as DashboardSpec,
    queues: queueMonitor as unknown as DashboardSpec,
    sms: smsActivity as unknown as DashboardSpec,
    health: systemHealth as unknown as DashboardSpec,
}

export function loadPreset(name: PresetName): DashboardSpec {
    const spec = PRESETS[name]
    if (!spec) {
        throw new Error(`Unknown preset: ${name}`)
    }
    return spec
}

export function listPresets(): Array<{ description: string; name: PresetName }> {
    return [
        { name: "calls", description: "Call monitoring \u2014 active calls, recent calls table" },
        { name: "queues", description: "Queue monitoring \u2014 queue depth, wait times" },
        { name: "sms", description: "SMS activity \u2014 recent messages, delivery status" },
        { name: "health", description: "System health \u2014 account status, recent logs" },
    ]
}
