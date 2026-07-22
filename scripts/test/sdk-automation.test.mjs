import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    openApiSemanticHash,
    repositoryFromUrl,
    semanticHash,
    stripTag,
} from "../check-sdk-drift.mjs"
import {
    loadContentIndex,
    loadSdkMatrix,
    validateContentIndex,
    validateSdkMatrix,
} from "../sdk-matrix.mjs"

describe("SDK automation", () => {
    it("covers every supported SDK with a valid template", () => {
        const matrix = loadSdkMatrix()
        assert.deepEqual(
            matrix.sdks.map((sdk) => sdk.id).sort(),
            ["dotnet", "java", "node", "php", "python", "ruby"],
        )
        assert.deepEqual(validateSdkMatrix(), [])
    })

    it("normalizes object key order before fingerprinting", () => {
        const first = { paths: { "/Calls": { get: { responses: {} } } }, openapi: "3.0.0" }
        const second = { openapi: "3.0.0", paths: { "/Calls": { get: { responses: {} } } } }
        assert.equal(semanticHash(first), semanticHash(second))
    })

    it("treats extracted and inline OpenAPI schemas as equivalent", () => {
        const inline = {
            openapi: "3.0.0",
            info: { version: "1" },
            paths: { "/Calls": { get: { responses: { 200: { schema: { type: "string" } } } } } },
            components: { schemas: {} },
        }
        const extracted = {
            openapi: "3.0.0",
            info: { version: "1" },
            paths: {
                "/Calls": {
                    get: {
                        responses: {
                            200: { schema: { $ref: "#/components/schemas/InlineResponse" } },
                        },
                    },
                },
            },
            components: { schemas: { InlineResponse: { type: "string" } } },
        }
        assert.equal(openApiSemanticHash(inline), openApiSemanticHash(extracted))
    })

    it("normalizes repository tag conventions", () => {
        assert.equal(stripTag("v6.4.1", "v"), "6.4.1")
        assert.equal(stripTag("5.4.1", ""), "5.4.1")
        assert.equal(stripTag("v.4.7.0", "v"), "4.7.0")
    })

    it("indexes immutable quickstarts for every supported language", () => {
        const index = loadContentIndex()
        const quickstartLanguages = new Set(
            index.sources
                .filter((source) => source.kind === "quickstart")
                .map((source) => source.language),
        )
        assert.deepEqual(
            [...quickstartLanguages].sort(),
            ["dotnet", "java", "node", "php", "python", "ruby"],
        )
        assert.ok(index.sources.some((source) => source.kind === "tutorial"))
        assert.deepEqual(validateContentIndex(), [])
    })

    it("derives GitHub API repository names from indexed URLs", () => {
        assert.equal(
            repositoryFromUrl("https://github.com/FreeClimbAPI/Node-Voice-Quickstart"),
            "FreeClimbAPI/Node-Voice-Quickstart",
        )
    })
})
