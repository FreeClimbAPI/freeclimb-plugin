import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tools } from "../lib/registry.js"
import {
    UI_TABLE_URI,
    UI_TABLE_MIME,
    UI_TOOLS,
    buildTablePayload,
    buildAccountPayload,
} from "../lib/ui.js"
import { UI_DASHBOARD_URI } from "../lib/dashboard-ui.js"
import { getUiResourceUri } from "../lib/server.js"

describe("MCP Apps UI", () => {
    it("declares a ui:// resource with the MCP app mime profile", () => {
        assert.ok(UI_TABLE_URI.startsWith("ui://"))
        assert.ok(UI_TABLE_MIME.includes("mcp-app"))
    })

    it("only attaches UI to tools that actually exist", () => {
        for (const name of UI_TOOLS) {
            assert.ok(name in tools, name)
        }
    })

    it("routes render_dashboard to its dedicated MCP app resource", () => {
        assert.equal(getUiResourceUri("render_dashboard"), UI_DASHBOARD_URI)
        assert.equal(getUiResourceUri("list_calls"), UI_TABLE_URI)
        assert.equal(getUiResourceUri("unknown_tool"), undefined)
    })

    it("builds a calls table from list_calls data", () => {
        const payload = buildTablePayload("list_calls", {
            calls: [
                {
                    from: "+15550000001",
                    to: "+15550000002",
                    status: "completed",
                    direction: "inbound",
                    dateCreated: "2026-01-01T00:00:00Z",
                },
            ],
        })
        assert.ok(payload)
        assert.equal(payload.rows.length, 1)
        assert.equal(payload.rows[0].status, "completed")
        const keys = new Set(payload.columns.map((c) => c.key))
        for (const key of Object.keys(payload.rows[0])) {
            assert.ok(keys.has(key), key)
        }
    })

    it("builds an SMS table from list_sms data", () => {
        const payload = buildTablePayload("list_sms", {
            messages: [{ from: "+15550000001", to: "+15550000002", text: "hi", status: "delivered" }],
        })
        assert.ok(payload)
        assert.equal(payload.rows[0].text, "hi")
    })

    it("builds a brands table from list_brands data", () => {
        const payload = buildTablePayload("list_brands", {
            brands: [{ brandId: "BR1", displayName: "Acme", entityType: "PRIVATE", identityStatus: "VERIFIED" }],
        })
        assert.ok(payload)
        assert.equal(payload.rows[0].displayName, "Acme")
    })

    it("builds a call logs table from list_call_logs data", () => {
        const payload = buildTablePayload("list_call_logs", {
            logs: [{ level: "ERROR", message: "webhook timeout", timestamp: "2026-01-01T00:00:00Z" }],
        })
        assert.ok(payload)
        assert.equal(payload.rows[0].level, "ERROR")
    })

    it("builds a queue members table from list_queue_members data", () => {
        const payload = buildTablePayload("list_queue_members", {
            queueMembers: [{ callId: "CA1", position: 1, waitTime: 30 }],
        })
        assert.ok(payload)
        assert.equal(payload.rows[0].callId, "CA1")
    })

    it("builds an exports table from list_exports data", () => {
        const payload = buildTablePayload("list_exports", {
            exports: [{ exportId: "EX1", resourceType: "Calls", status: "completed" }],
        })
        assert.ok(payload)
        assert.equal(payload.rows[0].status, "completed")
    })

    it("handles empty and malformed data without throwing", () => {
        for (const name of UI_TOOLS) {
            const empty = buildTablePayload(name, {})
            if (empty !== undefined) {
                assert.ok(Array.isArray(empty.rows))
            }
            buildTablePayload(name, null)
            buildTablePayload(name, "garbage")
        }
    })

    it("builds an account card", () => {
        const payload = buildAccountPayload({ alias: "Test Account", type: "trial", status: "active" })
        assert.ok(payload)
        assert.ok(payload.fields.length > 0)
    })
})
