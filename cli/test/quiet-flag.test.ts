import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../src/credentials.js"

describe("--quiet flag", function () {
    afterEach(() => nock.cleanAll())

    it("outputs only application IDs for applications:list", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${id}/Applications`)
            .query({})
            .reply(200, {
                applications: [
                    { applicationId: "AP111", alias: "App One", voiceUrl: "https://example.com" },
                    { applicationId: "AP222", alias: "App Two", voiceUrl: "https://example.com" },
                ],
            })
        const { stdout } = await runCommand(["applications:list", "--quiet"])
        expect(stdout.trim()).to.equal("AP111\nAP222")
    })

    it("outputs single ID for applications:get", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${id}/Applications/AP111`)
            .query({})
            .reply(200, { applicationId: "AP111", alias: "My App" })
        const { stdout } = await runCommand(["applications:get", "AP111", "--quiet"])
        expect(stdout.trim()).to.equal("AP111")
    })

    it("outputs call IDs for calls:list", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${id}/Calls`)
            .query({})
            .reply(200, {
                calls: [
                    { callId: "CA111", from: "+1111", to: "+2222", status: "completed" },
                    { callId: "CA222", from: "+3333", to: "+4444", status: "ringing" },
                ],
            })
        const { stdout } = await runCommand(["calls:list", "--quiet"])
        expect(stdout.trim()).to.equal("CA111\nCA222")
    })

    it("outputs nothing for 204 responses", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .delete(`/apiserver/Accounts/${id}/Applications/AP111`)
            .query({})
            .reply(204, "")
        const { stdout } = await runCommand(["applications:delete", "AP111", "--quiet"])
        expect(stdout.trim()).to.equal("")
    })

    it("outputs message IDs for sms:list", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .get(`/apiserver/Accounts/${id}/Messages`)
            .query({})
            .reply(200, {
                messages: [
                    { messageId: "SM111", from: "+1111", to: "+2222" },
                    { messageId: "SM222", from: "+3333", to: "+4444" },
                ],
            })
        const { stdout } = await runCommand(["sms:list", "--quiet"])
        expect(stdout.trim()).to.equal("SM111\nSM222")
    })

    it("outputs created resource ID for sms:send", async () => {
        const id = await cred.accountId
        nock("https://www.freeclimb.com")
            .post(`/apiserver/Accounts/${id}/Messages`)
            .query({})
            .reply(200, { messageId: "SM999", from: "+1111", to: "+2222", text: "Hello" })
        const { stdout } = await runCommand([
            "sms:send",
            "+1111",
            "+2222",
            "Hello",
            "--quiet",
        ])
        expect(stdout.trim()).to.equal("SM999")
    })
})
