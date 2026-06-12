import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../src/credentials.js"

describe("login --yes non-interactive", function () {
    afterEach(() => nock.cleanAll())

    it("logs in non-interactively with --accountId --apiKey --yes", async () => {
        const testAccountId = "AC0000000000000000000000000000000000000000"
        const testApiKey = "0000000000000000000000000000000000000000"

        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${testAccountId}`)
            .reply(200, { accountId: testAccountId })

        const { stdout } = await runCommand([
            "login",
            "--accountId",
            testAccountId,
            "--apiKey",
            testApiKey,
            "--yes",
        ])
        expect(stdout).to.contain("ACCOUNT_ID and API_KEY have been verified")
    })

    it("fails without --yes when --accountId and --apiKey are provided", async () => {
        const { error } = await runCommand([
            "login",
            "--accountId",
            "AC0000000000000000000000000000000000000000",
            "--apiKey",
            "0000000000000000000000000000000000000000",
        ])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it("fails when only --accountId is provided", async () => {
        const { error } = await runCommand([
            "login",
            "--accountId",
            "AC0000000000000000000000000000000000000000",
        ])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it("fails when only --apiKey is provided", async () => {
        const { error } = await runCommand([
            "login",
            "--apiKey",
            "0000000000000000000000000000000000000000",
        ])
        expect(error?.oclif?.exit).to.equal(2)
    })
})
