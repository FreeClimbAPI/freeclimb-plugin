import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    DashboardDataManager,
    extractSourceBindings,
    resolveDashboardSnapshot,
    validateSourceBindings,
    ValidationError,
} from "../lib/index.js"

describe("extractSourceBindings", () => {
    it("finds top-level and nested bindings with their state paths", () => {
        const bindings = extractSourceBindings({
            calls: { $source: "calls" },
            section: {
                nested: { $source: "logs", params: { maxItems: 10 } },
            },
        })

        assert.deepEqual(
            bindings.map((b) => b.path).sort(),
            ["/calls", "/section/nested"],
        )
        const nested = bindings.find((b) => b.path === "/section/nested")
        assert.equal(nested.binding.$source, "logs")
        assert.deepEqual(nested.binding.params, { maxItems: 10 })
    })

    it("stops descending past the depth limit", () => {
        let state = { $source: "calls" }
        for (let i = 0; i < 15; i++) {
            state = { level: state }
        }

        const bindings = extractSourceBindings(state)
        assert.equal(bindings.length, 0)
    })

    it("does not descend into arrays", () => {
        const bindings = extractSourceBindings({
            list: [{ $source: "calls" }],
        })
        assert.equal(bindings.length, 0)
    })
})

describe("validateSourceBindings", () => {
    it("accepts a spec with known sources", () => {
        assert.doesNotThrow(() =>
            validateSourceBindings({
                root: "main",
                elements: {},
                state: { calls: { $source: "calls" } },
            }),
        )
    })

    it("accepts a spec with no state", () => {
        assert.doesNotThrow(() => validateSourceBindings({ root: "main", elements: {} }))
    })

    it("throws on an unknown $source", () => {
        assert.throws(
            () =>
                validateSourceBindings({
                    root: "main",
                    elements: {},
                    state: { data: { $source: "unknown_source" } },
                }),
            (error) => {
                assert.ok(error instanceof ValidationError)
                assert.match(error.message, /Unknown data source "unknown_source"/)
                return true
            },
        )
    })
})

describe("resolveDashboardSnapshot", () => {
    it("resolves multiple sources once and forwards parameters", async () => {
        const received = []
        let authChecks = 0
        const result = await resolveDashboardSnapshot(
            {
                root: "main",
                elements: {},
                state: {
                    calls: { $source: "calls", params: { status: "completed" } },
                    account: { $source: "account" },
                },
            },
            {
                checkAuth: async () => {
                    authChecks += 1
                },
                sources: {
                    calls: async (params) => {
                        received.push(params)
                        return { calls: [], total: 0 }
                    },
                    account: async () => ({ status: "active" }),
                },
            },
        )

        assert.equal(authChecks, 1)
        assert.deepEqual(received, [{ status: "completed" }])
        assert.deepEqual(result.errors, [])
        assert.deepEqual(
            result.updates.map((update) => update.path).sort(),
            ["/account", "/calls"],
        )
    })

    it("returns successful updates alongside source-specific failures", async () => {
        const result = await resolveDashboardSnapshot(
            {
                root: "main",
                elements: {},
                state: {
                    calls: { $source: "calls" },
                    logs: { $source: "logs" },
                },
            },
            {
                checkAuth: async () => {},
                sources: {
                    calls: async () => ({ total: 3 }),
                    logs: async () => {
                        throw new Error("request failed")
                    },
                },
            },
        )

        assert.deepEqual(result.updates, [{ path: "/calls", value: { total: 3 } }])
        assert.deepEqual(result.errors, [
            { message: "request failed", path: "/logs", source: "logs" },
        ])
    })

    it("returns an authentication error without reading sources", async () => {
        let fetched = false
        const result = await resolveDashboardSnapshot(
            {
                root: "main",
                elements: {},
                state: { calls: { $source: "calls" } },
            },
            {
                checkAuth: async () => {
                    throw new Error("secret details")
                },
                sources: {
                    calls: async () => {
                        fetched = true
                        return {}
                    },
                },
            },
        )

        assert.equal(fetched, false)
        assert.deepEqual(result, {
            errors: [{ message: "Authentication failed", path: "", source: "auth" }],
            updates: [],
        })
    })

    it("rejects unknown sources before authentication", async () => {
        let authChecked = false
        await assert.rejects(
            () =>
                resolveDashboardSnapshot(
                    {
                        root: "main",
                        elements: {},
                        state: { data: { $source: "unknown" } },
                    },
                    {
                        checkAuth: async () => {
                            authChecked = true
                        },
                    },
                ),
            ValidationError,
        )
        assert.equal(authChecked, false)
    })
})

describe("DashboardDataManager", () => {
    it("fetches from injected sources and batches updates via onUpdate", async () => {
        const updates = []
        const manager = new DashboardDataManager((batch) => updates.push(...batch), undefined, {
            sources: {
                calls: async () => ({ calls: [{ callId: "CA123" }] }),
                logs: async () => ({ logs: [] }),
            },
        })

        await manager.start(
            {
                root: "main",
                elements: {},
                state: {
                    calls: { $source: "calls" },
                    logs: { $source: "logs" },
                },
            },
            60000,
        )
        manager.stop()

        assert.equal(updates.length, 2)
        assert.deepEqual(
            updates.map((u) => u.path).sort(),
            ["/calls", "/logs"],
        )
    })

    it("buckets a failing source fetch as a fetch error", async () => {
        const errors = []
        const manager = new DashboardDataManager(() => {}, (source, error) => errors.push({ source, error }), {
            sources: {
                calls: async () => {
                    throw new Error("boom")
                },
            },
        })

        await manager.start(
            { root: "main", elements: {}, state: { calls: { $source: "calls" } } },
            60000,
        )
        manager.stop()

        assert.equal(errors.length, 1)
        assert.equal(errors[0].source, "fetch")
        assert.equal(errors[0].error.message, "boom")
    })

    it("buckets a failing auth check as an auth error without fetching sources", async () => {
        const errors = []
        let fetched = false
        const manager = new DashboardDataManager(() => {}, (source, error) => errors.push({ source, error }), {
            checkAuth: async () => {
                throw new Error("not authenticated")
            },
            sources: {
                calls: async () => {
                    fetched = true
                    return {}
                },
            },
        })

        await manager.start(
            { root: "main", elements: {}, state: { calls: { $source: "calls" } } },
            60000,
        )
        manager.stop()

        assert.equal(errors.length, 1)
        assert.equal(errors[0].source, "auth")
        assert.equal(errors[0].error.message, "not authenticated")
        assert.equal(fetched, false)
    })

    it("warns via onWarn when many sources poll at a short interval", async () => {
        const warnings = []
        const state = {}
        for (let i = 0; i < 4; i++) {
            state[`source${i}`] = { $source: "calls" }
        }

        const manager = new DashboardDataManager(() => {}, undefined, {
            onWarn: (message) => warnings.push(message),
            sources: { calls: async () => ({}) },
        })

        await manager.start({ root: "main", elements: {}, state }, 10000)
        manager.stop()

        assert.equal(warnings.length, 1)
        assert.match(warnings[0], /4 data sources at 10s interval may hit API rate limits/)
    })

    it("does not warn when the interval is long enough", async () => {
        const warnings = []
        const state = {}
        for (let i = 0; i < 4; i++) {
            state[`source${i}`] = { $source: "calls" }
        }

        const manager = new DashboardDataManager(() => {}, undefined, {
            onWarn: (message) => warnings.push(message),
            sources: { calls: async () => ({}) },
        })

        await manager.start({ root: "main", elements: {}, state }, 15000)
        manager.stop()

        assert.equal(warnings.length, 0)
    })

    it("does nothing for a spec with no state", async () => {
        const updates = []
        const manager = new DashboardDataManager((batch) => updates.push(...batch))

        await manager.start({ root: "main", elements: {} }, 60000)
        manager.stop()

        assert.equal(updates.length, 0)
    })

    it("stops polling on stop() and is safe to call twice", async () => {
        const manager = new DashboardDataManager(() => {}, undefined, {
            sources: { calls: async () => ({}) },
        })

        await manager.start(
            { root: "main", elements: {}, state: { calls: { $source: "calls" } } },
            60000,
        )

        manager.stop()
        manager.stop()
    })
})
