import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ValidationError } from "@freeclimb/core"
import {
    DASHBOARD_HTML,
    UI_DASHBOARD_MIME,
    UI_DASHBOARD_URI,
    buildDashboardPayload,
} from "../lib/dashboard-ui.js"

function metricSpec(value = { $state: "/calls/total" }) {
    return {
        root: "main",
        state: { calls: { $source: "calls" } },
        elements: {
            main: {
                type: "Box",
                props: { flexDirection: "column" },
                children: ["heading", "metric"],
            },
            heading: { type: "Heading", props: { level: "h1", text: "Operations" } },
            metric: { type: "Metric", props: { label: "Calls", value } },
        },
    }
}

describe("dashboard MCP app", () => {
    it("declares a self-contained MCP app resource", () => {
        assert.ok(UI_DASHBOARD_URI.startsWith("ui://"))
        assert.ok(UI_DASHBOARD_MIME.includes("mcp-app"))
        assert.match(DASHBOARD_HTML, /freeclimb-dashboard/)
        assert.doesNotMatch(DASHBOARD_HTML, /\.innerHTML|insertAdjacentHTML/)
    })

    it("requests fullscreen after rendering when the host supports it", () => {
        assert.match(DASHBOARD_HTML, /availableDisplayModes:\["inline","fullscreen"\]/)
        assert.match(
            DASHBOARD_HTML,
            /request\("ui\/request-display-mode",\{mode:"fullscreen"\}\)/,
        )
        assert.match(DASHBOARD_HTML, /hostContext&&result\.hostContext\.availableDisplayModes/)
    })

    it("resolves state references into a bounded component tree", () => {
        const payload = buildDashboardPayload(
            metricSpec(),
            { errors: [], updates: [{ path: "/calls", value: { total: 12 } }] },
            "2026-07-21T12:00:00.000Z",
        )

        assert.equal(payload.snapshotAt, "2026-07-21T12:00:00.000Z")
        assert.equal(payload.root.type, "Box")
        assert.equal(payload.root.children[1].type, "Metric")
        assert.equal(payload.root.children[1].props.value, 12)
    })

    it("resolves static state without exposing unresolved source bindings", () => {
        const staticPayload = buildDashboardPayload(
            {
                root: "metric",
                state: { label: "Ready" },
                elements: {
                    metric: {
                        type: "Metric",
                        props: { label: "State", value: { $state: "/label" } },
                    },
                },
            },
            { errors: [], updates: [] },
        )
        const failedSourcePayload = buildDashboardPayload(metricSpec(), {
            errors: [{ message: "failed", path: "/calls", source: "calls" }],
            updates: [],
        })

        assert.equal(staticPayload.root.props.value, "Ready")
        assert.equal(failedSourcePayload.root.children[1].props.value, null)
    })

    it("masks sensitive fields in state-backed tables", () => {
        const spec = {
            root: "table",
            state: { calls: { $source: "calls" } },
            elements: {
                table: {
                    type: "Table",
                    props: {
                        columns: [
                            { key: "callId", header: "Call" },
                            { key: "from", header: "From" },
                            { key: "status", header: "Status" },
                            { key: "text", header: "Text" },
                        ],
                        rows: { $state: "/calls/calls" },
                    },
                },
            },
        }
        const payload = buildDashboardPayload(spec, {
            errors: [],
            updates: [
                {
                    path: "/calls",
                    value: {
                        calls: [
                            {
                                callId: "CA-secret",
                                from: "+15551234567",
                                status: "completed",
                                text: "<img src=x onerror=alert(1)>",
                            },
                        ],
                    },
                },
            ],
        })
        const row = payload.root.props.rows[0]

        assert.equal(row.callId, "[redacted]")
        assert.equal(row.from, "[redacted]")
        assert.equal(row.status, "completed")
        assert.equal(row.text, "[hidden]")
    })

    it("replaces source failures with non-sensitive panel errors", () => {
        const payload = buildDashboardPayload(metricSpec(), {
            errors: [{ message: "Authorization header secret", path: "/calls", source: "calls" }],
            updates: [],
        })

        assert.deepEqual(payload.errors, [
            { message: "calls data unavailable", source: "calls" },
        ])
    })

    it("relabels live terminal status text as a manual snapshot", () => {
        const payload = buildDashboardPayload(
            {
                root: "status",
                elements: {
                    status: {
                        type: "StatusLine",
                        props: { text: "Live updating · Ctrl+C to exit", status: "info" },
                    },
                },
            },
            { errors: [], updates: [] },
        )

        assert.equal(payload.root.props.text, "Read-only snapshot · call again to refresh")
    })

    it("rejects unsupported components, dangling children, cycles, and malformed pointers", () => {
        assert.throws(
            () =>
                buildDashboardPayload(
                    {
                        root: "main",
                        elements: { main: { type: "Html", props: { html: "<script>" } } },
                    },
                    { errors: [], updates: [] },
                ),
            ValidationError,
        )
        assert.throws(
            () =>
                buildDashboardPayload(
                    {
                        root: "main",
                        elements: {
                            main: { type: "Box", props: {}, children: ["missing"] },
                        },
                    },
                    { errors: [], updates: [] },
                ),
            ValidationError,
        )
        assert.throws(
            () =>
                buildDashboardPayload(
                    {
                        root: "main",
                        elements: {
                            main: { type: "Box", props: {}, children: ["main"] },
                        },
                    },
                    { errors: [], updates: [] },
                ),
            ValidationError,
        )
        assert.throws(
            () => buildDashboardPayload(metricSpec({ $state: "calls/total" }), {
                errors: [],
                updates: [],
            }),
            ValidationError,
        )
    })

    it("rejects dashboards over the source and element limits", () => {
        const state = {}
        for (let index = 0; index < 9; index += 1) {
            state[`calls${index}`] = { $source: "calls" }
        }
        assert.throws(
            () =>
                buildDashboardPayload(
                    { ...metricSpec(), state },
                    { errors: [], updates: [] },
                ),
            /too many data sources/,
        )

        const elements = {}
        for (let index = 0; index < 61; index += 1) {
            elements[`element${index}`] = { type: "Metric", props: {} }
        }
        assert.throws(
            () =>
                buildDashboardPayload(
                    { root: "element0", elements },
                    { errors: [], updates: [] },
                ),
            /too many elements/,
        )
    })
})
