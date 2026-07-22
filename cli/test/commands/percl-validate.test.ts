import { expect } from "chai"
import { runCommand } from "@oclif/test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("percl:validate command", function () {
    let directory: string

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), "freeclimb-percl-cli-test-"))
    })

    afterEach(async () => {
        await rm(directory, { force: true, recursive: true })
    })

    it("validates a PerCL file without authentication", async () => {
        const path = join(directory, "valid.percl.json")
        await writeFile(path, JSON.stringify([{ Say: { text: "Hello" } }]))

        const { stdout } = await runCommand(["percl:validate", path, "--json"])
        const result = JSON.parse(stdout)

        expect(result).to.deep.equal({ valid: true, errors: [], warnings: [] })
    })

    it("returns a failing exit for invalid PerCL", async () => {
        const path = join(directory, "invalid.percl.json")
        await writeFile(path, JSON.stringify([{ Say: {} }]))

        const { error, stdout } = await runCommand(["percl:validate", path, "--json"])
        const result = JSON.parse(stdout)

        expect(result.valid).to.equal(false)
        expect(result.errors[0]).to.include("Say.text is required")
        expect(error?.oclif?.exit).to.equal(1)
    })
})
