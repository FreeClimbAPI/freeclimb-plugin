import { createApiAxios } from "../http.js"
import { readResources } from "../resources.js"
import type { ResourceReader } from "../resources.js"
import { ValidationError } from "../validation.js"
import type { SourceBinding, DashboardSpec } from "./types.js"
import { isSourceBinding } from "./types.js"

const VALID_SOURCES = new Set(Object.keys(readResources))
const RATE_LIMIT_WARNING_THRESHOLD_MS = 15000
const RATE_LIMIT_WARNING_MIN_SOURCES = 3

export function validateSourceBindings(spec: DashboardSpec): void {
    if (!spec.state) return
    const bindings = extractSourceBindings(spec.state)
    for (const { binding, path } of bindings) {
        if (!VALID_SOURCES.has(binding.$source)) {
            throw new ValidationError(
                `Unknown data source "${binding.$source}" at state path "${path}". ` +
                    `Valid sources: ${[...VALID_SOURCES].join(", ")}`,
            )
        }
    }
}

export interface StateUpdate {
    path: string
    value: unknown
}

export interface SourceBindingMatch {
    binding: SourceBinding
    path: string
}

export function extractSourceBindings(
    state: Record<string, unknown>,
    prefix = "",
    maxDepth = 10,
): SourceBindingMatch[] {
    if (maxDepth <= 0) return []
    const results: SourceBindingMatch[] = []
    for (const [key, value] of Object.entries(state)) {
        const path = prefix ? `${prefix}/${key}` : `/${key}`
        if (isSourceBinding(value)) {
            results.push({ path, binding: value })
        } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            results.push(
                ...extractSourceBindings(value as Record<string, unknown>, path, maxDepth - 1),
            )
        }
    }
    return results
}

export interface DashboardDataManagerOptions {
    checkAuth?: () => Promise<unknown>
    onWarn?: (message: string) => void
    sources?: Record<string, ResourceReader>
}

export class DashboardDataManager {
    private interval: ReturnType<typeof setInterval> | null = null
    private bindings: SourceBindingMatch[] = []
    private onUpdate: (updates: StateUpdate[]) => void
    private onError?: (source: string, error: Error) => void
    private onWarn?: (message: string) => void
    private sources: Record<string, ResourceReader>
    private checkAuth: () => Promise<unknown>

    constructor(
        onUpdate: (updates: StateUpdate[]) => void,
        onError?: (source: string, error: Error) => void,
        options: DashboardDataManagerOptions = {},
    ) {
        this.onUpdate = onUpdate
        this.onError = onError
        this.onWarn = options.onWarn
        this.sources = options.sources ?? readResources
        this.checkAuth = options.checkAuth ?? createApiAxios
    }

    async start(spec: DashboardSpec, refreshMs: number): Promise<void> {
        if (!spec.state) return

        this.bindings = extractSourceBindings(spec.state)
        if (this.bindings.length === 0) return

        if (
            refreshMs < RATE_LIMIT_WARNING_THRESHOLD_MS &&
            this.bindings.length > RATE_LIMIT_WARNING_MIN_SOURCES
        ) {
            this.onWarn?.(
                `Warning: ${this.bindings.length} data sources at ${refreshMs / 1000}s interval may hit API rate limits`,
            )
        }

        await this.fetchAll()
        this.interval = setInterval(() => this.fetchAll(), refreshMs)
    }

    private async fetchAll(): Promise<void> {
        try {
            await this.checkAuth()
        } catch (error: unknown) {
            this.onError?.("auth", error instanceof Error ? error : new Error(String(error)))
            return
        }

        const results = await Promise.allSettled(
            this.bindings.map(async ({ path, binding }) => {
                const fetcher = this.sources[binding.$source]
                if (!fetcher) {
                    throw new Error(`Unknown data source: ${binding.$source}`)
                }
                const data = await fetcher(binding.params)
                return { path, value: data, source: binding.$source }
            }),
        )

        const updates: StateUpdate[] = []
        for (const result of results) {
            if (result.status === "fulfilled") {
                updates.push(result.value)
            } else {
                const reason =
                    result.reason instanceof Error
                        ? result.reason
                        : new Error(String(result.reason))
                this.onError?.("fetch", reason)
            }
        }

        if (updates.length > 0) {
            this.onUpdate(updates)
        }
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }
}
