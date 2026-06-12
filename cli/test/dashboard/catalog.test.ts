import { expect } from "chai"
import { getDashboardPrompt, freeclimbCatalog } from "../../src/dashboard/catalog.js"

describe("Dashboard Catalog", function () {
    describe("getDashboardPrompt", function () {
        it("returns a non-empty string", function () {
            const prompt = getDashboardPrompt()
            expect(prompt).to.be.a("string")
            expect(prompt.length).to.be.greaterThan(0)
        })

        it("includes FreeClimb brand colors", function () {
            const prompt = getDashboardPrompt()
            expect(prompt).to.include("lightTeal")
        })

        it("includes custom component names", function () {
            const prompt = getDashboardPrompt()
            expect(prompt).to.include("CallStatusCard")
            expect(prompt).to.include("QueueDepthGauge")
            expect(prompt).to.include("LogStream")
        })

        it("includes custom rules when provided", function () {
            const prompt = getDashboardPrompt(["Use dark background"])
            expect(prompt).to.include("Use dark background")
        })

        it("truncates overly long rules", function () {
            const longRule = "x".repeat(600)
            const prompt = getDashboardPrompt([longRule])
            // Rule should be truncated to 500 chars
            expect(prompt).to.not.include(longRule)
        })

        it("throws when too many custom rules", function () {
            const tooManyRules = Array.from({ length: 51 }, (_, i) => `Rule ${i}`)
            expect(() => getDashboardPrompt(tooManyRules)).to.throw("Too many custom rules")
        })
    })

    describe("freeclimbCatalog", function () {
        it("is defined", function () {
            expect(freeclimbCatalog).to.exist
        })
    })
})
