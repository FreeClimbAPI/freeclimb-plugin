import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { listPresets, loadPreset } from "../lib/index.js"

describe("dashboard presets", () => {
    it("lists all four presets with names and descriptions", () => {
        const presets = listPresets()
        assert.equal(presets.length, 4)
        assert.deepEqual(
            presets.map((p) => p.name).sort(),
            ["calls", "health", "queues", "sms"],
        )
        for (const preset of presets) {
            assert.ok(preset.description.length > 0)
        }
    })

    it("loads every listed preset as a spec with components", () => {
        for (const { name } of listPresets()) {
            const spec = loadPreset(name)
            assert.ok(spec)
            assert.equal(typeof spec, "object")
        }
    })

    it("throws on unknown preset names", () => {
        assert.throws(() => loadPreset("nonexistent"))
    })
})
