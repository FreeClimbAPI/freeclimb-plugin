import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tools } from "../lib/tools.js"

const MUTATING_TOOL_NAMES = [
    "make_call",
    "send_sms",
    "buy_number",
    "update_call",
    "create_application",
    "update_application",
    "delete_application",
    "delete_number",
]

describe("MCP tool definitions", () => {
    it("exposes exactly the 19 read-only tools", () => {
        assert.equal(Object.keys(tools).length, 19)
    })

    it("contains no mutating tools (ADR 0005)", () => {
        for (const name of MUTATING_TOOL_NAMES) {
            assert.ok(!(name in tools), `mutating tool must not exist: ${name}`)
        }
        for (const name of Object.keys(tools)) {
            assert.ok(
                !/^(create|update|delete|buy|send|make)_/.test(name),
                `tool name looks mutating: ${name}`,
            )
        }
    })

    it("keeps every key consistent with its tool name", () => {
        for (const [key, tool] of Object.entries(tools)) {
            assert.equal(tool.name, key)
        }
    })

    it("gives every tool a description and an object input schema", () => {
        for (const tool of Object.values(tools)) {
            assert.ok(tool.description.length > 10, tool.name)
            assert.equal(tool.inputSchema.type, "object", tool.name)
        }
    })

    it("declares required properties that exist in the schema", () => {
        for (const tool of Object.values(tools)) {
            const { properties = {}, required = [] } = tool.inputSchema
            for (const name of required) {
                assert.ok(name in properties, `${tool.name} requires undeclared property ${name}`)
            }
        }
    })

    it("keeps the local PerCL helpers available", () => {
        assert.ok("generate_percl" in tools)
        assert.ok("validate_percl" in tools)
    })
})
