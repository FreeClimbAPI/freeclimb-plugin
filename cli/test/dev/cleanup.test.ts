import { expect } from "chai"
import nock from "nock"
import { mkdtempSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { cred } from "../../src/credentials.js"
import { performCleanup } from "../../src/dev/cleanup.js"
import { writeDevState, readDevState, type DevState } from "../../src/dev/state.js"

const BASE_URL = "https://www.freeclimb.com"

function mockLogger(): { log: (msg: string) => void; logs: string[] } {
    const logs: string[] = []
    return { log: (msg: string) => logs.push(msg), logs }
}

describe("performCleanup", () => {
    let tempDir: string
    let accountId: string

    beforeEach(async () => {
        tempDir = mkdtempSync(join(tmpdir(), "fc-cli-cleanup-"))
        accountId = await cred.accountId
    })

    afterEach(() => {
        nock.cleanAll()
    })

    it("should restore numbers and delete temp app on success", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_temp123",
            isTemporary: true,
            previousAppUrls: null,
            numberAssignments: [
                { phoneNumberId: "PN_abc", previousApplicationId: "AP_old456" },
            ],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        // Mock number restoration
        nock(BASE_URL)
            .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`, {
                applicationId: "AP_old456",
            })
            .reply(200, { phoneNumberId: "PN_abc" })

        // Mock app deletion
        nock(BASE_URL)
            .delete(`/apiserver/Accounts/${accountId}/Applications/AP_temp123`)
            .reply(204)

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, false)

        // State file should be removed on full success
        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.false
    })

    it("should restore app URLs for non-temporary apps", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_existing",
            isTemporary: false,
            previousAppUrls: {
                voiceUrl: "https://myapp.com/voice",
                smsUrl: "https://myapp.com/sms",
                statusCallbackUrl: null,
                callConnectUrl: null,
            },
            numberAssignments: [],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        // Mock URL restoration
        nock(BASE_URL)
            .post(`/apiserver/Accounts/${accountId}/Applications/AP_existing`, {
                voiceUrl: "https://myapp.com/voice",
                smsUrl: "https://myapp.com/sms",
                statusCallbackUrl: "",
                callConnectUrl: "",
            })
            .reply(200, {})

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, false)

        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.false
    })

    it("should retain state file when number restoration fails", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_temp123",
            isTemporary: true,
            previousAppUrls: null,
            numberAssignments: [
                { phoneNumberId: "PN_abc", previousApplicationId: "AP_old456" },
            ],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        // Number restoration fails
        nock(BASE_URL)
            .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
            .reply(500, { message: "Internal error" })

        // App deletion succeeds
        nock(BASE_URL)
            .delete(`/apiserver/Accounts/${accountId}/Applications/AP_temp123`)
            .reply(204)

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, false)

        // State file retained because number restore failed
        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.true
    })

    it("should retain state file when app deletion fails", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_temp123",
            isTemporary: true,
            previousAppUrls: null,
            numberAssignments: [],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        // App deletion fails
        nock(BASE_URL)
            .delete(`/apiserver/Accounts/${accountId}/Applications/AP_temp123`)
            .reply(500, { message: "Internal error" })

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, false)

        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.true
    })

    it("should send empty applicationId to unassign when previous is null", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_temp123",
            isTemporary: true,
            previousAppUrls: null,
            numberAssignments: [
                { phoneNumberId: "PN_abc", previousApplicationId: null },
            ],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        // Should send empty string to unassign
        nock(BASE_URL)
            .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`, {
                applicationId: "",
            })
            .reply(200, { phoneNumberId: "PN_abc" })

        nock(BASE_URL)
            .delete(`/apiserver/Accounts/${accountId}/Applications/AP_temp123`)
            .reply(204)

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, false)

        expect(existsSync(join(tempDir, "dev-state.json"))).to.be.false
    })

    it("should produce no console output in JSON mode", async () => {
        const state: DevState = {
            pid: 99999,
            tunnelUrl: "https://test.ngrok.io",
            applicationId: "AP_temp123",
            isTemporary: true,
            previousAppUrls: null,
            numberAssignments: [],
            createdAt: new Date().toISOString(),
        }
        writeDevState(tempDir, state)

        nock(BASE_URL)
            .delete(`/apiserver/Accounts/${accountId}/Applications/AP_temp123`)
            .reply(204)

        const logger = mockLogger()
        await performCleanup(state, tempDir, logger, true)

        expect(logger.logs).to.have.length(0)
    })
})
