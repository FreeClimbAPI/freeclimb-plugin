import { expect } from "chai"
import { parseDashboardSpec, isSourceBinding } from "../../src/dashboard/types.js"

describe("Dashboard Types", function () {
    describe("isSourceBinding", function () {
        it("returns true for valid source binding", function () {
            expect(isSourceBinding({ $source: "calls" })).to.be.true
        })

        it("returns true for source binding with params", function () {
            expect(isSourceBinding({ $source: "logs", params: { maxItems: 20 } })).to.be.true
        })

        it("returns false for null", function () {
            expect(isSourceBinding(null)).to.be.false
        })

        it("returns false for string", function () {
            expect(isSourceBinding("calls")).to.be.false
        })

        it("returns false for object without $source", function () {
            expect(isSourceBinding({ name: "test" })).to.be.false
        })

        it("returns false for object with non-string $source", function () {
            expect(isSourceBinding({ $source: 123 })).to.be.false
        })
    })

    describe("parseDashboardSpec", function () {
        const validSpec = {
            root: "main",
            elements: {
                main: {
                    type: "Box",
                    props: { flexDirection: "column" },
                    children: ["heading"],
                },
                heading: {
                    type: "Heading",
                    props: { text: "Dashboard" },
                },
            },
            state: {
                calls: { $source: "calls" },
            },
        }

        it("parses a valid spec", function () {
            const result = parseDashboardSpec(validSpec)
            expect(result.root).to.equal("main")
            expect(result.elements).to.have.property("main")
        })

        it("parses spec without state", function () {
            const { state: _, ...noState } = validSpec
            const result = parseDashboardSpec(noState)
            expect(result.root).to.equal("main")
            expect(result.state).to.be.undefined
        })

        it("throws on missing root", function () {
            expect(() => parseDashboardSpec({ elements: validSpec.elements })).to.throw(
                "Invalid dashboard spec",
            )
        })

        it("throws on empty root", function () {
            expect(() => parseDashboardSpec({ root: "", elements: validSpec.elements })).to.throw(
                "Invalid dashboard spec",
            )
        })

        it("throws on missing elements", function () {
            expect(() => parseDashboardSpec({ root: "main" })).to.throw("Invalid dashboard spec")
        })

        it("throws on non-object input", function () {
            expect(() => parseDashboardSpec("not an object")).to.throw("Invalid dashboard spec")
        })

        it("throws on null input", function () {
            expect(() => parseDashboardSpec(null)).to.throw("Invalid dashboard spec")
        })

        it("throws on element with missing type", function () {
            expect(() =>
                parseDashboardSpec({
                    root: "main",
                    elements: {
                        main: { props: {} },
                    },
                }),
            ).to.throw("Invalid dashboard spec")
        })
    })
})
