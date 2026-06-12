import { expect } from "chai"
import nock from "nock"
import sinon from "sinon"
import { prompts } from "../lib/prompts.js"
import { runCommand } from "@oclif/test"

describe("Test for login command", function () {
    afterEach(() => {
        sinon.restore()
        nock.cleanAll()
    })

    it("Test exit code 2 is produced when user responds N", async () => {
        sinon.stub(prompts, "confirm").resolves(false)
        const { error } = await runCommand(["login"])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it("tests warning for an incorrect account id length and checks action on error for verification", async () => {
        const testAccount = "1111122222333334444455555666667777788888"
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${testAccount}`)
            .reply(500, "error")

        sinon.stub(prompts, "confirm").resolves(true)
        sinon.stub(prompts, "password").resolves(testAccount)
        const { stdout } = await runCommand(["login"])
        expect(stdout).to.contain(
            "<---Inputted ACCOUNT_ID and API_KEY where not valid. Please try again.-->"
        )
    })

    it("tests warning for an incorrect auth token length and checks action on error for verification", async () => {
        const testAccount = "AC1111122222333334444455555666667777788888"
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${testAccount}`)
            .reply(500, "error")

        sinon.stub(prompts, "confirm").resolves(true)
        sinon.stub(prompts, "password").resolves(testAccount)
        const { stdout } = await runCommand(["login"])
        expect(stdout).to.contain(
            "<---Inputted ACCOUNT_ID and API_KEY where not valid. Please try again.-->"
        )
    })

    it("tests for response when account is verified", async () => {
        const testAccount = "1234567"
        const testJson = { message: "Response from server" }
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${testAccount}`)
            .reply(200, testJson)

        sinon.stub(prompts, "confirm").resolves(true)
        sinon.stub(prompts, "password").resolves(testAccount)
        const { stdout } = await runCommand(["login"])
        expect(stdout).to.contain(
            "<---Your ACCOUNT_ID and API_KEY have been verified through Freeclimb.--->"
        )
    })
})
