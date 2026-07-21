import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../../src/credentials.js"

describe("exports:list", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    it("returns export list from the API", async () => {
        const testJson = {
            exports: [{ exportId: "EX1", resourceType: "Calls", status: "completed" }],
        }
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${await cred.accountId}/Exports`)
            .query({})
            .reply(200, testJson)
        const { stdout } = await runCommand(["exports:list", "--json"])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.exports).to.have.length(1)
        expect(parsed.data.exports[0].exportId).to.equal("EX1")
    })
})

describe("exports:get", function () {
    const exportId = "userInput-exportId"

    afterEach(() => {
        nock.cleanAll()
    })

    it("returns export metadata from the API", async () => {
        const testJson = { exportId, resourceType: "Calls", status: "completed" }
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${await cred.accountId}/Exports/${exportId}`)
            .query({})
            .reply(200, testJson)
        const { stdout } = await runCommand(["exports:get", exportId, "--json"])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.exportId).to.equal(exportId)
    })
})

describe("exports:create", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    it("POSTs the export spec to the API", async () => {
        nock("https://www.freeclimb.com")
            .post(`/apiserver/Accounts/${await cred.accountId}/Exports`, {
                resourceType: "Calls",
                output: { type: "csv" },
                query: { status: "completed" },
                format: ["callId", "status"],
            })
            .query({})
            .reply(200, { exportId: "EX1" })
        const { stdout } = await runCommand([
            "exports:create",
            "--resourceType",
            "Calls",
            "--query",
            '{"status":"completed"}',
            "--format",
            "callId,status",
            "--json",
        ])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.exportId).to.equal("EX1")
    })

    it("previews the request with --dry-run", async () => {
        nock.disableNetConnect()
        try {
            const { stdout } = await runCommand([
                "exports:create",
                "--resourceType",
                "Messages",
                "--dry-run",
                "--json",
            ])
            const parsed = JSON.parse(stdout)
            expect(parsed.dryRun).to.equal(true)
            expect(parsed.method).to.equal("POST")
            expect(parsed.endpoint).to.equal("Exports")
            expect(parsed.body).to.deep.equal({
                resourceType: "Messages",
                output: { type: "csv" },
            })
        } finally {
            nock.enableNetConnect()
        }
    })
})

describe("exports:delete", function () {
    const exportId = "userInput-exportId"

    afterEach(() => {
        nock.cleanAll()
    })

    it("DELETEs the export with --yes", async () => {
        nock("https://www.freeclimb.com")
            .delete(`/apiserver/Accounts/${await cred.accountId}/Exports/${exportId}`)
            .query({})
            .reply(204)
        const { stdout } = await runCommand(["exports:delete", exportId, "--yes"])
        expect(stdout).to.contain("Received a success code from FreeClimb")
    })
})

describe("exports:download", function () {
    const exportId = "userInput-exportId"
    let outputDir: string

    beforeEach(() => {
        outputDir = mkdtempSync(join(tmpdir(), "freeclimb-export-test-"))
    })

    afterEach(() => {
        nock.cleanAll()
        rmSync(outputDir, { recursive: true, force: true })
    })

    it("writes the export file to disk", async () => {
        const outputPath = join(outputDir, "test-export.csv")
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${await cred.accountId}/Exports/${exportId}/Download`)
            .query({})
            .reply(200, "callId,status\nCA1,completed")
        const { stdout } = await runCommand([
            "exports:download",
            exportId,
            "--output",
            outputPath,
        ])
        expect(stdout).to.contain(`Downloaded export to ${outputPath}`)
    })
})
