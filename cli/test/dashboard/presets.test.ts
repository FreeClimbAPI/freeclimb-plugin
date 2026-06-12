import { expect } from "chai"
import { loadPreset, listPresets } from "../../src/dashboard/presets/index.js"

describe("Dashboard Presets", function () {
    describe("listPresets", function () {
        it("returns all 4 presets", function () {
            const presets = listPresets()
            expect(presets).to.have.length(4)
        })

        it("each preset has name and description", function () {
            const presets = listPresets()
            for (const p of presets) {
                expect(p).to.have.property("name").that.is.a("string")
                expect(p).to.have.property("description").that.is.a("string")
            }
        })
    })

    describe("loadPreset", function () {
        it("loads calls preset with root and elements", function () {
            const spec = loadPreset("calls")
            expect(spec).to.have.property("root")
            expect(spec).to.have.property("elements")
        })

        it("loads queues preset", function () {
            const spec = loadPreset("queues")
            expect(spec).to.have.property("root")
        })

        it("loads sms preset", function () {
            const spec = loadPreset("sms")
            expect(spec).to.have.property("root")
        })

        it("loads health preset", function () {
            const spec = loadPreset("health")
            expect(spec).to.have.property("root")
        })

        it("throws for unknown preset", function () {
            expect(() => loadPreset("unknown" as any)).to.throw()
        })
    })
})
