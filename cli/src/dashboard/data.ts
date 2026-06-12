import type { AxiosInstance } from "axios"
import { createApiAxios } from "../http.js"
import { ValidationError } from "../validation.js"
import type { SourceBinding, DashboardSpec } from "./types.js"
import { isSourceBinding } from "./types.js"

type DataFetcher = (client: AxiosInstance, params?: Record<string, unknown>) => Promise<unknown>

const DATA_SOURCES: Record<string, DataFetcher> = {
    calls: async (client, params) => {
        const resp = await client.get("/Calls", { params })
        return resp.data
    },
    sms: async (client, params) => {
        const resp = await client.get("/Messages", { params })
        return resp.data
    },
    queues: async (client, params) => {
        const resp = await client.get("/Queues", { params })
        return resp.data
    },
    conferences: async (client, params) => {
        const resp = await client.get("/Conferences", { params })
        return resp.data
    },
    account: async (client) => {
        const resp = await client.get("")
        return resp.data
    },
    logs: async (client, params) => {
        if (params?.pql) {
            const resp = await client.post("/Logs", params)
            return resp.data
        }
        const resp = await client.get("/Logs", {
            params: { maxItems: (params?.maxItems as number) || 100 },
        })
        return resp.data
    },
    numbers: async (client, params) => {
        const resp = await client.get("/IncomingPhoneNumbers", { params })
        return resp.data
    },
    applications: async (client, params) => {
        const resp = await client.get("/Applications", { params })
        return resp.data
    },
    recordings: async (client, params) => {
        const resp = await client.get("/Recordings", { params })
        return resp.data
    },
}

const VALID_SOURCES = new Set(Object.keys(DATA_SOURCES))

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

interface StateUpdate {
    path: string
    value: unknown
}

function extractSourceBindings(
    state: Record<string, unknown>,
    prefix = "",
    maxDepth = 10,
): Array<{ binding: SourceBinding; path: string }> {
    if (maxDepth <= 0) return []
    const results: Array<{ binding: SourceBinding; path: string }> = []
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

export class DashboardDataManager {
    private interval: ReturnType<typeof setInterval> | null = null
    private bindings: Array<{ binding: SourceBinding; path: string }> = []
    private onUpdate: (updates: StateUpdate[]) => void
    private onError?: (source: string, error: Error) => void

    constructor(
        onUpdate: (updates: StateUpdate[]) => void,
        onError?: (source: string, error: Error) => void,
    ) {
        this.onUpdate = onUpdate
        this.onError = onError
    }

    async start(spec: DashboardSpec, refreshMs: number): Promise<void> {
        if (!spec.state) return

        this.bindings = extractSourceBindings(spec.state)
        if (this.bindings.length === 0) return

        if (refreshMs < 15000 && this.bindings.length > 3) {
            process.stderr.write(
                `Warning: ${this.bindings.length} data sources at ${refreshMs / 1000}s interval may hit API rate limits\n`,
            )
        }

        await this.fetchAll()
        this.interval = setInterval(() => this.fetchAll(), refreshMs)
    }

    private async fetchAll(): Promise<void> {
        let client: AxiosInstance
        try {
            client = await createApiAxios()
        } catch (error: unknown) {
            this.onError?.("auth", error instanceof Error ? error : new Error(String(error)))
            return
        }

        const results = await Promise.allSettled(
            this.bindings.map(async ({ path, binding }) => {
                const fetcher = DATA_SOURCES[binding.$source]
                if (!fetcher) {
                    throw new Error(`Unknown data source: ${binding.$source}`)
                }
                const data = await fetcher(client, binding.params)
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
