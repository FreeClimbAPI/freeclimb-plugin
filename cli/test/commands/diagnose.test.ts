import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../../src/credentials.js"

describe("diagnose command", function () {
    const originalIsTTY = process.stdout.isTTY

    beforeEach(() => {
        process.stdout.isTTY = false
    })

    afterEach(() => {
        process.stdout.isTTY = originalIsTTY
        nock.cleanAll()
    })

    it("hits the account endpoint once for auth and account status", async () => {
        const accountId = await cred.accountId

        nock("https://www.freeclimb.com").get("/apiserver").reply(200, {})
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${accountId}`)
            .once()
            .reply(200, { status: "active", type: "trial" })

        const { stdout } = await runCommand(["diagnose", "--json"])
        const parsed = JSON.parse(stdout)

        expect(parsed.success).to.equal(true)
        expect(parsed.data.overallStatus).to.equal("healthy")
        expect(parsed.data.checks.map((check: { name: string }) => check.name)).to.deep.equal([
            "Credentials",
            "API Connectivity",
            "Authentication",
            "Account Status",
        ])
        expect(parsed.data.checks.find((check: { name: string }) => check.name === "Authentication")?.status).to.equal("pass")
        expect(parsed.data.checks.find((check: { name: string }) => check.name === "Account Status")?.message).to.equal("Account active (trial)")
    })

    it("reports authentication failure from a single account request", async () => {
        const accountId = await cred.accountId

        nock("https://www.freeclimb.com").get("/apiserver").reply(200, {})
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${accountId}`)
            .twice()
            .reply(401, { code: 50, message: "Unauthorized" })

        const { stdout } = await runCommand(["diagnose", "--json"])
        const parsed = JSON.parse(stdout)

        expect(parsed.data.overallStatus).to.equal("error")
        expect(parsed.data.checks.find((check: { name: string }) => check.name === "Authentication")?.message).to.equal("Invalid credentials")
        expect(parsed.data.checks.find((check: { name: string }) => check.name === "Account Status")?.message).to.equal("Cannot check - authentication failed")
    })
})
