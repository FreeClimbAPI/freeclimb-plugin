import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    computeDocsDrift,
    parseLlmsPages,
    perclCommandsFromSpec,
} from "../docs-catalog.mjs"
import { loadDocsIndex, validateDocsIndex } from "../sdk-matrix.mjs"

const spec = {
    components: {
        schemas: {
            PerclCommand: {
                discriminator: {
                    propertyName: "command",
                    mapping: {
                        Say: "#/components/schemas/Say",
                        Hangup: "#/components/schemas/Hangup",
                        TerminateConference: "#/components/schemas/TerminateConference",
                    },
                },
            },
        },
    },
}

const llms = [
    "# FreeClimb Docs",
    "- [PerCL Overview](https://docs.freeclimb.com/docs/performance-command-language.md): overview",
    "- [Error Codes](https://docs.freeclimb.com/docs/error-codes.md)",
    "- [Say](https://docs.freeclimb.com/reference/say)",
    "- [Duplicate](https://docs.freeclimb.com/docs/performance-command-language.md)",
    "- [Changelog entry](https://docs.freeclimb.com/changelog/some-fix.md)",
].join("\n")

describe("docs catalog extraction", () => {
    it("reads PerCL commands from the OpenAPI discriminator mapping", () => {
        assert.deepEqual(perclCommandsFromSpec(spec), ["Hangup", "Say", "TerminateConference"])
    })

    it("parses unique doc page URLs from llms.txt and drops changelog", () => {
        assert.deepEqual(parseLlmsPages(llms), [
            "https://docs.freeclimb.com/docs/error-codes.md",
            "https://docs.freeclimb.com/docs/performance-command-language.md",
            "https://docs.freeclimb.com/reference/say",
        ])
    })
})

describe("docs drift diffing", () => {
    const catalog = {
        pages: [
            "https://docs.freeclimb.com/docs/a.md",
            "https://docs.freeclimb.com/docs/b.md",
        ],
        percl: ["Say", "Hangup"],
    }

    it("reports no drift when the catalog matches the baseline", () => {
        const report = computeDocsDrift({ catalog, baseline: catalog })
        assert.equal(report.docsDrift, false)
        assert.deepEqual(report.pagesAdded, [])
        assert.deepEqual(report.perclRemoved, [])
    })

    it("flags added and removed pages and PerCL commands", () => {
        const baseline = {
            pages: ["https://docs.freeclimb.com/docs/a.md", "https://docs.freeclimb.com/docs/old.md"],
            percl: ["Say"],
        }
        const report = computeDocsDrift({ catalog, baseline })
        assert.deepEqual(report.pagesAdded, ["https://docs.freeclimb.com/docs/b.md"])
        assert.deepEqual(report.pagesRemoved, ["https://docs.freeclimb.com/docs/old.md"])
        assert.deepEqual(report.perclAdded, ["Hangup"])
        assert.deepEqual(report.perclRemoved, [])
        assert.equal(report.docsDrift, true)
    })
})

describe("docs index configuration", () => {
    it("ships a valid docs-index.json", () => {
        assert.deepEqual(validateDocsIndex(), [])
    })

    it("pins a non-empty page and PerCL baseline", () => {
        const index = loadDocsIndex()
        assert.ok(index.baseline.pages.length > 0)
        assert.ok(index.baseline.percl.length > 0)
        assert.ok(index.baseline.pages.every((p) => p.startsWith("https://docs.freeclimb.com/")))
        assert.ok(!index.baseline.pages.some((p) => p.includes("/changelog/")))
    })
})
