import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tools } from "../lib/tools.js"
import { handlers, dispatchTool, defaultContext } from "../lib/handlers.js"

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

    it("validates PerCL locally without touching the context", async () => {
        const result = await dispatchTool("validate_percl", { percl: [{ Hangup: {} }] })
        assert.ok(result)
    })

    it("rejects generate_percl with control characters in text", async () => {
        await assert.rejects(() =>
            dispatchTool("generate_percl", { pattern: "greeting", text: "hi\x01there" }),
        )
    })
})
