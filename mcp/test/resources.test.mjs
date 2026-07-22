import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
    discoverSkillResources,
    listFreeclimbResources,
    readFreeclimbResource,
} from "../lib/resources.js"

describe("MCP resource resolution", () => {
    it("discovers skill resources from the CLI skills manifest", () => {
        const skills = discoverSkillResources()
        assert.ok(skills.length > 0)
        for (const skill of skills) {
            assert.ok(skill.uri.startsWith("freeclimb://skills/"))
            assert.ok(skill.name)
            assert.ok(skill.description)
        }
    })

    it("lists the account/numbers/applications JSON resources plus skill docs", () => {
        const resources = listFreeclimbResources()
        const uris = resources.map((r) => r.uri)
        assert.ok(uris.includes("freeclimb://account"))
        assert.ok(uris.includes("freeclimb://numbers"))
        assert.ok(uris.includes("freeclimb://applications"))
        assert.ok(uris.some((uri) => uri.startsWith("freeclimb://skills/")))
    })

    it("reads a skill resource's markdown content by uri", async () => {
        const [skill] = discoverSkillResources()
        const resource = await readFreeclimbResource(skill.uri)
        assert.equal(resource.mimeType, "text/markdown")
        assert.ok(resource.text.length > 0)
    })

    it("exposes the canonical plugin SDK skill without duplicating it", async () => {
        const uri = "freeclimb://skills/freeclimb-sdk-applications"
        const skills = discoverSkillResources()
        assert.ok(skills.some((skill) => skill.uri === uri))
        const resource = await readFreeclimbResource(uri)
        assert.match(resource.text, /# FreeClimb SDKs/)
        assert.match(resource.text, /sdk\/sdk-matrix\.json/)
        assert.match(resource.text, /sdk\/content-index\.json/)
        assert.match(resource.text, /Do not clone a quickstart, tutorial, or SDK repository/)
        assert.match(resource.text, /read exactly one reference/)
        assert.doesNotMatch(resource.text, /createConfiguration/)
        assert.ok(resource.text.split("\n").length < 80)
    })

    it("throws for an unknown skill resource uri", async () => {
        await assert.rejects(() => readFreeclimbResource("freeclimb://skills/does-not-exist"))
    })

    it("throws for an unknown freeclimb:// resource uri", async () => {
        await assert.rejects(() => readFreeclimbResource("freeclimb://not-a-real-resource"))
    })
})
