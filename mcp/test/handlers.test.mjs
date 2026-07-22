import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ValidationError } from "@freeclimb/core"
import { tools, handlers, dispatchTool, defaultContext, toolRegistry } from "../lib/registry.js"

describe("MCP tool dispatch", () => {
    it("has a handler for every tool name", () => {
        for (const name of Object.keys(tools)) {
            assert.equal(typeof handlers[name], "function", name)
        }
    })

    it("has no handlers for names that aren't tools", () => {
        for (const name of Object.keys(handlers)) {
            assert.ok(name in tools, name)
        }
    })

    it("throws the same error shape for an unknown tool name", async () => {
        await assert.rejects(() => dispatchTool("not_a_real_tool", {}), (error) => {
            assert.ok(error instanceof Error)
            assert.equal(error.message, "Unknown tool: not_a_real_tool")
            return true
        })
    })

    it("dispatches list_calls through the injected context", async () => {
        let capturedArgs
        const ctx = {
            ...defaultContext,
            listCalls: async (args) => {
                capturedArgs = args
                return { calls: [{ callId: "CA1" }] }
            },
        }

        const result = await dispatchTool(
            "list_calls",
            { to: "+15551234567", from: "+15557654321", status: "completed" },
            ctx,
        )

        assert.deepEqual(capturedArgs, {
            to: "+15551234567",
            from: "+15557654321",
            status: "completed",
        })
        assert.deepEqual(result, { calls: [{ callId: "CA1" }] })
    })

    it("dispatches get_account through the injected context", async () => {
        const ctx = { ...defaultContext, getAccount: async () => ({ accountId: "AC1" }) }

        const result = await dispatchTool("get_account", {}, ctx)

        assert.deepEqual(result, { accountId: "AC1" })
    })

    it("dispatches get_application through the injected context with the given id", async () => {
        let capturedId
        const ctx = {
            ...defaultContext,
            getApplication: async (id) => {
                capturedId = id
                return { applicationId: id }
            },
        }

        const result = await dispatchTool("get_application", { applicationId: "AP1" }, ctx)

        assert.equal(capturedId, "AP1")
        assert.deepEqual(result, { applicationId: "AP1" })
    })

    it("dispatches list_brands through the injected context", async () => {
        const ctx = {
            ...defaultContext,
            listBrands: async () => ({ brands: [{ brandId: "BR1" }] }),
        }

        const result = await dispatchTool("list_brands", {}, ctx)

        assert.deepEqual(result, { brands: [{ brandId: "BR1" }] })
    })

    it("dispatches get_brand through the injected context with the given id", async () => {
        let capturedId
        const ctx = {
            ...defaultContext,
            getBrand: async (id) => {
                capturedId = id
                return { brandId: id }
            },
        }

        const result = await dispatchTool("get_brand", { brandId: "BR1" }, ctx)

        assert.equal(capturedId, "BR1")
        assert.deepEqual(result, { brandId: "BR1" })
    })

    it("dispatches list_call_logs through the injected context with the given callId", async () => {
        let capturedCallId
        const ctx = {
            ...defaultContext,
            listCallLogs: async (callId) => {
                capturedCallId = callId
                return { logs: [{ level: "ERROR", message: "timeout" }] }
            },
        }

        const result = await dispatchTool("list_call_logs", { callId: "CA1" }, ctx)

        assert.equal(capturedCallId, "CA1")
        assert.deepEqual(result, { logs: [{ level: "ERROR", message: "timeout" }] })
    })

    it("dispatches list_conference_participants through the injected context", async () => {
        let capturedId
        const ctx = {
            ...defaultContext,
            listConferenceParticipants: async (conferenceId) => {
                capturedId = conferenceId
                return { participants: [{ callId: "CA2" }] }
            },
        }

        const result = await dispatchTool(
            "list_conference_participants",
            { conferenceId: "CF1" },
            ctx,
        )

        assert.equal(capturedId, "CF1")
        assert.deepEqual(result, { participants: [{ callId: "CA2" }] })
    })

    it("dispatches get_recording through the injected context with the given id", async () => {
        let capturedId
        const ctx = {
            ...defaultContext,
            getRecording: async (id) => {
                capturedId = id
                return { recordingId: id, durationSec: 42 }
            },
        }

        const result = await dispatchTool("get_recording", { recordingId: "RE1" }, ctx)

        assert.equal(capturedId, "RE1")
        assert.deepEqual(result, { recordingId: "RE1", durationSec: 42 })
    })

    it("dispatches list_exports through the injected context", async () => {
        const ctx = {
            ...defaultContext,
            listExports: async () => ({ exports: [{ exportId: "EX1", status: "completed" }] }),
        }

        const result = await dispatchTool("list_exports", {}, ctx)

        assert.deepEqual(result, { exports: [{ exportId: "EX1", status: "completed" }] })
    })

    it("rejects removed PerCL helper tools", async () => {
        await assert.rejects(() => dispatchTool("validate_percl", { percl: [{ Hangup: {} }] }))
        await assert.rejects(() => dispatchTool("generate_percl", { pattern: "greeting" }))
    })

    it("resolves and renders a dashboard snapshot through the injected context", async () => {
        let receivedSpec
        const ctx = {
            ...defaultContext,
            resolveDashboardSnapshot: async (spec) => {
                receivedSpec = spec
                return {
                    errors: [],
                    updates: [{ path: "/calls", value: { total: 4 } }],
                }
            },
        }
        const spec = {
            root: "metric",
            state: { calls: { $source: "calls" } },
            elements: {
                metric: {
                    type: "Metric",
                    props: { label: "Calls", value: { $state: "/calls/total" } },
                },
            },
        }

        const result = await dispatchTool("render_dashboard", { spec }, ctx)

        assert.deepEqual(receivedSpec, spec)
        assert.equal(result.message, "FreeClimb dashboard snapshot rendered in-IDE.")
        assert.equal(result.dashboard.root.props.value, 4)
    })

    it("rejects every tool with required args when called with empty input", async () => {
        const stubCtx = {
            ...defaultContext,
            getCall: async () => {
                throw new Error("should not reach handler")
            },
        }

        for (const [name, entry] of Object.entries(toolRegistry)) {
            const required = entry.inputSchema.required ?? []
            if (required.length === 0) continue

            await assert.rejects(
                () => dispatchTool(name, {}, stubCtx),
                (error) => {
                    assert.ok(error instanceof ValidationError, name)
                    return true
                },
                name,
            )
        }
    })

    it("still dispatches get_call when required args are present", async () => {
        let capturedId
        const ctx = {
            ...defaultContext,
            getCall: async (id) => {
                capturedId = id
                return { callId: id }
            },
        }

        const result = await dispatchTool("get_call", { callId: "CA123" }, ctx)

        assert.equal(capturedId, "CA123")
        assert.deepEqual(result, { callId: "CA123" })
    })
})
