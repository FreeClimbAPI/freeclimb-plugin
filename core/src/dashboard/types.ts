import { z } from "zod"
import { ValidationError } from "../validation.js"

export interface SourceBinding {
    $source: string
    params?: Record<string, unknown>
}

export interface DashboardSpec {
    elements: Record<
        string,
        {
            children?: string[]
            props: Record<string, unknown>
            type: string
        }
    >
    root: string
    state?: Record<string, unknown>
}

export type PresetName = "calls" | "queues" | "sms" | "health"

export const PRESET_NAMES: PresetName[] = ["calls", "queues", "sms", "health"]

const DashboardElementSchema = z.object({
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()),
    children: z.array(z.string()).optional(),
})

const DashboardSpecSchema = z.object({
    root: z.string().min(1),
    elements: z.record(z.string(), DashboardElementSchema),
    state: z.record(z.string(), z.unknown()).optional(),
})

export function parseDashboardSpec(input: unknown): DashboardSpec {
    const result = DashboardSpecSchema.safeParse(input)
    if (!result.success) {
        const issues = result.error.issues.map((i) => i.message).join(", ")
        throw new ValidationError(`Invalid dashboard spec: ${issues}`)
    }
    return result.data as DashboardSpec
}

export function isSourceBinding(value: unknown): value is SourceBinding {
    return (
        typeof value === "object" &&
        value !== null &&
        "$source" in value &&
        typeof (value as SourceBinding).$source === "string"
    )
}
