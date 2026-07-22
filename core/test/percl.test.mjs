import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    PERCL_COMMANDS,
    PERCL_PATTERNS,
    validatePercl,
    generatePercl,
} from "../lib/index.js"

describe("validatePercl", () => {
    it("accepts a valid PerCL array", () => {
        const result = validatePercl([
            { Say: { text: "Hello" } },
            { GetDigits: { actionUrl: "https://example.com/menu", maxDigits: 1 } },
            { Hangup: {} },
        ])
        assert.equal(result.valid, true)
        assert.deepEqual(result.errors, [])
    })

    it("rejects non-array input", () => {
        const result = validatePercl({ Say: { text: "Hi" } })
        assert.equal(result.valid, false)
        assert.ok(result.errors.length > 0)
    })

    it("rejects unknown commands", () => {
        const result = validatePercl([{ NotACommand: {} }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((e) => e.includes("NotACommand")))
    })

    it("rejects commands whose params are not objects", () => {
        const result = validatePercl([{ Say: "just a string" }])
        assert.equal(result.valid, false)
    })

    it("rejects localhost callback URLs", () => {
        const result = validatePercl([{ Redirect: { actionUrl: "http://localhost:3000/next" } }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("public HTTPS URL")))
    })

    it("rejects relative callback URLs", () => {
        const result = validatePercl([{ Redirect: { actionUrl: "/next" } }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("public HTTPS URL")))
    })

    it("rejects insecure callback URLs", () => {
        const result = validatePercl([{ Redirect: { actionUrl: "http://example.com/next" } }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("public HTTPS URL")))
    })

    it("rejects private network callback URLs", () => {
        const result = validatePercl([{ Redirect: { actionUrl: "https://192.168.1.10/next" } }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("public HTTPS URL")))
    })

    it("rejects missing required command parameters", () => {
        const result = validatePercl([{ Say: {} }, { Redirect: {} }])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("Say.text is required")))
        assert.ok(result.errors.some((error) => error.includes("Redirect.actionUrl is required")))
    })

    it("rejects command parameters with invalid types", () => {
        const result = validatePercl([
            { Say: { text: 42 } },
            { GetDigits: { actionUrl: "https://example.com/menu", maxDigits: "1" } },
        ])
        assert.equal(result.valid, false)
        assert.ok(result.errors.some((error) => error.includes("Say.text must be a string")))
        assert.ok(result.errors.some((error) => error.includes("GetDigits.maxDigits must be a number")))
    })
})

describe("generatePercl", () => {
    it("covers every declared pattern", () => {
        assert.equal(PERCL_PATTERNS.length, 9)
    })

    for (const pattern of PERCL_PATTERNS) {
        it(`generates valid PerCL for the ${pattern} pattern`, () => {
            const percl = generatePercl(pattern)
            assert.ok(Array.isArray(percl))
            assert.ok(percl.length > 0)
            const result = validatePercl(percl)
            assert.equal(result.valid, true, JSON.stringify(result.errors))
        })
    }

    it("threads text and actionUrl into the generated commands", () => {
        const percl = generatePercl("menu", "Press 1.", "https://example.com/next")
        const getDigits = percl[0].GetDigits
        assert.equal(getDigits.actionUrl, "https://example.com/next")
        assert.equal(getDigits.prompts[0].Say.text, "Press 1.")
    })

    it("throws on unknown patterns", () => {
        assert.throws(() => generatePercl("not-a-pattern"))
    })
})

describe("PERCL_COMMANDS", () => {
    it("includes the core voice commands", () => {
        for (const name of ["Say", "GetDigits", "RecordUtterance", "OutDial", "Hangup", "Sms"]) {
            assert.ok(PERCL_COMMANDS.includes(name), name)
        }
    })
})
