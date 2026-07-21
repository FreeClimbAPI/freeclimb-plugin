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

export interface DashboardSnapshotError {
    message: string
    path: string
    source: string
}

export interface DashboardSnapshot {
    errors: DashboardSnapshotError[]
    updates: StateUpdate[]
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

async function fetchSourceBindings(
    bindings: SourceBindingMatch[],
    sources: Record<string, ResourceReader>,
    checkAuth: () => Promise<unknown>,
): Promise<DashboardSnapshot> {
    try {
        await checkAuth()
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return {
            errors: [{ message: message || "Authentication failed", path: "", source: "auth" }],
            updates: [],
        }
    }

    const results = await Promise.allSettled(
        bindings.map(async ({ path, binding }) => {
            const fetcher = sources[binding.$source]
            if (!fetcher) {
                throw new Error(`Unknown data source: ${binding.$source}`)
            }
            const value = await fetcher(binding.params)
            return { path, source: binding.$source, value }
        }),
    )

    const errors: DashboardSnapshotError[] = []
    const updates: StateUpdate[] = []
    for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") {
            updates.push({ path: result.value.path, value: result.value.value })
        } else {
            const match = bindings[index]
            const message =
                result.reason instanceof Error ? result.reason.message : String(result.reason)
            errors.push({ message, path: match.path, source: match.binding.$source })
        }
    }

    return { errors, updates }
}

export async function resolveDashboardSnapshot(
    spec: DashboardSpec,
    options: Pick<DashboardDataManagerOptions, "checkAuth" | "sources"> = {},
): Promise<DashboardSnapshot> {
    validateSourceBindings(spec)
    const bindings = extractSourceBindings(spec.state ?? {})
    if (bindings.length === 0) return { errors: [], updates: [] }

    const snapshot = await fetchSourceBindings(
        bindings,
        options.sources ?? readResources,
        options.checkAuth ?? createApiAxios,
    )
    if (snapshot.errors.some((e) => e.source === "auth")) {
        return {
            errors: [{ message: "Authentication failed", path: "", source: "auth" }],
            updates: [],
        }
    }
    return snapshot
}

export class DashboardDataManager {
    private interval: ReturnType<typeof setInterval> | null = null
    private fetching = false
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
        if (this.fetching) return
        this.fetching = true
        try {
            const { errors, updates } = await fetchSourceBindings(
                this.bindings,
                this.sources,
                this.checkAuth,
            )

            for (const error of errors) {
                this.onError?.(error.source === "auth" ? "auth" : "fetch", new Error(error.message))
            }

            if (updates.length > 0) {
                this.onUpdate(updates)
            }
        } finally {
            this.fetching = false
        }
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }
}
