import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    ValidationError,
    rejectControlChars,
    validateResourceId,
    validatePhoneNumber,
    validateUrl,
    sanitizeInput,
    filterFields,
    filterFieldsDeep,
    extractQuietIds,
} from "../lib/index.js"

describe("rejectControlChars", () => {
    it("allows plain strings, newlines, and tabs", () => {
        rejectControlChars("hello world", "field")
        rejectControlChars("line1\nline2\ttabbed\r", "field")
        rejectControlChars(undefined, "field")
    })

    it("throws on control characters", () => {
        assert.throws(() => rejectControlChars("bad\u0000input", "field"), ValidationError)
        assert.throws(() => rejectControlChars("bad\u001binput", "field"), ValidationError)
    })
})

describe("validateResourceId", () => {
    it("accepts well-formed resource IDs", () => {
        validateResourceId("AC1234567890abcdef1234567890abcdef12345678", "accountId")
        validateResourceId("CAabc123", "callId")
    })

    it("rejects empty IDs", () => {
        assert.throws(() => validateResourceId("", "id"), ValidationError)
        assert.throws(() => validateResourceId("   ", "id"), ValidationError)
        assert.throws(() => validateResourceId(undefined, "id"), ValidationError)
    })

    it("rejects embedded query, fragment, and encoded characters", () => {
        assert.throws(() => validateResourceId("CA123?x=1", "id"), ValidationError)
        assert.throws(() => validateResourceId("CA123#frag", "id"), ValidationError)
        assert.throws(() => validateResourceId("CA%32123", "id"), ValidationError)
    })

    it("rejects path traversal sequences", () => {
        assert.throws(() => validateResourceId("../etc/passwd", "id"), ValidationError)
        assert.throws(() => validateResourceId("CA123/../other", "id"), ValidationError)
        assert.throws(() => validateResourceId("..\\windows", "id"), ValidationError)
    })
})

describe("validatePhoneNumber", () => {
    it("accepts E.164 numbers", () => {
        validatePhoneNumber("+15551234567", "to")
        validatePhoneNumber("15551234567", "to")
        validatePhoneNumber(undefined, "to")
    })

    it("rejects formatted or malformed numbers", () => {
        assert.throws(() => validatePhoneNumber("(555) 123-4567", "to"), ValidationError)
        assert.throws(() => validatePhoneNumber("555-123-4567", "to"), ValidationError)
        assert.throws(() => validatePhoneNumber("+1555abc", "to"), ValidationError)
    })
})

describe("validateUrl", () => {
    it("accepts absolute URLs", () => {
        validateUrl("https://example.com/voice", "voiceUrl")
        validateUrl(undefined, "voiceUrl")
    })

    it("rejects relative or malformed URLs", () => {
        assert.throws(() => validateUrl("/voice", "voiceUrl"), ValidationError)
        assert.throws(() => validateUrl("not a url", "voiceUrl"), ValidationError)
    })
})

describe("sanitizeInput", () => {
    it("strips control characters but keeps whitespace", () => {
        assert.equal(sanitizeInput("a\u0000b\u001bc"), "abc")
        assert.equal(sanitizeInput("line1\nline2\ttab"), "line1\nline2\ttab")
    })
})

describe("filterFields / filterFieldsDeep", () => {
    it("filters flat objects to requested fields", () => {
        assert.deepEqual(filterFields({ a: 1, b: 2, c: 3 }, ["a", "c"]), { a: 1, c: 3 })
        assert.deepEqual(filterFields({ a: 1 }, []), { a: 1 })
    })

    it("filters arrays and nested arrays deeply", () => {
        const data = { calls: [{ callId: "CA1", status: "completed", from: "+15550000001" }] }
        assert.deepEqual(filterFieldsDeep(data, ["callId"]), { calls: [{ callId: "CA1" }] })
    })
})

describe("extractQuietIds", () => {
    it("extracts IDs from arrays, nested arrays, and single resources", () => {
        assert.equal(extractQuietIds([{ callId: "CA1" }, { callId: "CA2" }], "callId"), "CA1\nCA2")
        assert.equal(extractQuietIds({ calls: [{ callId: "CA1" }] }, "callId"), "CA1")
        assert.equal(extractQuietIds({ callId: "CA1" }, "callId"), "CA1")
        assert.equal(extractQuietIds({ other: true }, "callId"), "")
    })
})
