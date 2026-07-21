import { expect } from "chai"
import nock from "nock"
import { runCommand } from "@oclif/test"
import { cred } from "../../src/credentials.js"

describe("calls:webrtc-token", function () {
    afterEach(() => {
        nock.cleanAll()
    })

    it("POSTs the token request body and prints the JWT", async () => {
        nock("https://www.freeclimb.com")
            .post(`/apiserver/Accounts/${await cred.accountId}/Calls/WebRTC/Token`, {
                to: "+15551234567",
                from: "+15557654321",
                uses: 2,
            })
            .query({})
            .reply(200, "jwt-token-value")
        const { stdout } = await runCommand([
            "calls:webrtc-token",
            "--to",
            "+15551234567",
            "--from",
            "+15557654321",
            "--uses",
            "2",
        ])
        expect(stdout.trim()).to.equal("jwt-token-value")
    })

    it("wraps the token in a JSON envelope with --json", async () => {
        nock("https://www.freeclimb.com")
            .post(`/apiserver/Accounts/${await cred.accountId}/Calls/WebRTC/Token`, {
                to: "+15551234567",
                from: "+15557654321",
                uses: 1,
            })
            .query({})
            .reply(200, "jwt-token-value")
        const { stdout } = await runCommand([
            "calls:webrtc-token",
            "--to",
            "+15551234567",
            "--from",
            "+15557654321",
            "--json",
        ])
        const parsed = JSON.parse(stdout)
        expect(parsed.success).to.equal(true)
        expect(parsed.data.token).to.equal("jwt-token-value")
    })
})
