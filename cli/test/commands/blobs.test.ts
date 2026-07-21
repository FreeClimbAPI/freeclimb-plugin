import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../../src/credentials.js"

describe("blobs:list", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    it("returns blob list from the API", async () => {
        const testJson = {
            blobs: [{ blobId: "BL1", alias: "my-state" }],
        }
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${await cred.accountId}/Blobs`)
            .query({})
            .reply(200, testJson)
        const { stdout } = await runCommand(["blobs:list", "--json"])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.blobs).to.have.length(1)
        expect(parsed.data.blobs[0].blobId).to.equal("BL1")
    })
})

describe("blobs:get", function () {
    const blobId = "userInput-blobId"

    afterEach(() => {
        nock.cleanAll()
    })

    it("returns blob metadata from the API", async () => {
        const testJson = { blobId, alias: "my-state", value: 1 }
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${await cred.accountId}/Blobs/${blobId}`)
            .query({})
            .reply(200, testJson)
        const { stdout } = await runCommand(["blobs:get", blobId, "--json"])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.blobId).to.equal(blobId)
    })
})

describe("blobs:create", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    it("POSTs blob data to the API", async () => {
        nock("https://www.freeclimb.com")
            .post(`/apiserver/Accounts/${await cred.accountId}/Blobs`, {
                alias: "my-state",
                value: 1,
            })
            .query({})
            .reply(200, { blobId: "BL1" })
        const { stdout } = await runCommand([
            "blobs:create",
            "--data",
            '{"alias":"my-state","value":1}',
            "--json",
        ])
        const parsed = JSON.parse(stdout)
        expect(parsed.data.blobId).to.equal("BL1")
    })

    it("previews the request with --dry-run", async () => {
        nock.disableNetConnect()
        try {
            const { stdout } = await runCommand([
                "blobs:create",
                "--data",
                '{"alias":"my-state"}',
                "--dry-run",
                "--json",
            ])
            const parsed = JSON.parse(stdout)
            expect(parsed.dryRun).to.equal(true)
            expect(parsed.method).to.equal("POST")
            expect(parsed.endpoint).to.equal("Blobs")
            expect(parsed.body).to.deep.equal({ alias: "my-state" })
        } finally {
            nock.enableNetConnect()
        }
    })

    it("rejects invalid JSON in --data", async () => {
        const { error } = await runCommand(["blobs:create", "--data", "{not-json"])
        expect(error?.oclif?.exit).to.equal(2)
    })
})

describe("blobs:delete", function () {
    const blobId = "userInput-blobId"

    afterEach(() => {
        nock.cleanAll()
    })

    it("DELETEs the blob with --yes", async () => {
        nock("https://www.freeclimb.com")
            .delete(`/apiserver/Accounts/${await cred.accountId}/Blobs/${blobId}`)
            .query({})
            .reply(204)
        const { stdout } = await runCommand(["blobs:delete", blobId, "--yes"])
        expect(stdout).to.contain("Received a success code from FreeClimb")
    })
})
