import { expect } from "chai"
import nock from "nock"
import { cred } from "../../src/credentials.js"
import {
    getAppUrls,
    createTempApp,
    updateAppUrls,
    restoreAppUrls,
    deleteTempApp,
} from "../../src/dev/app-manager.js"

const BASE_URL = "https://www.freeclimb.com"

describe("app-manager", () => {
    let accountId: string

    before(async () => {
        accountId = await cred.accountId
    })

    afterEach(() => {
        nock.cleanAll()
    })

    describe("getAppUrls", () => {
        it("should return all URL fields", async () => {
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/Applications/AP_abc`)
                .reply(200, {
                    voiceUrl: "https://app.com/voice",
                    smsUrl: "https://app.com/sms",
                    statusCallbackUrl: "https://app.com/status",
                    callConnectUrl: "https://app.com/connect",
                })

            const urls = await getAppUrls("AP_abc")
            expect(urls.voiceUrl).to.equal("https://app.com/voice")
            expect(urls.smsUrl).to.equal("https://app.com/sms")
            expect(urls.statusCallbackUrl).to.equal("https://app.com/status")
            expect(urls.callConnectUrl).to.equal("https://app.com/connect")
        })

        it("should return null for missing URLs", async () => {
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/Applications/AP_abc`)
                .reply(200, {})

            const urls = await getAppUrls("AP_abc")
            expect(urls.voiceUrl).to.be.null
            expect(urls.smsUrl).to.be.null
        })
    })

    describe("createTempApp", () => {
        it("should create app with correct webhook URLs and return appId", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/Applications`, (body: any) => {
                    expect(body.alias).to.match(/^fc-cli-dev-\d+$/)
                    expect(body.voiceUrl).to.equal("https://tunnel.ngrok.io/voice")
                    expect(body.smsUrl).to.equal("https://tunnel.ngrok.io/sms")
                    expect(body.statusCallbackUrl).to.equal("https://tunnel.ngrok.io/status")
                    expect(body.callConnectUrl).to.equal("https://tunnel.ngrok.io/call-connect")
                    return true
                })
                .reply(200, { applicationId: "AP_new123" })

            const result = await createTempApp("https://tunnel.ngrok.io")
            expect(result.applicationId).to.equal("AP_new123")
            expect(result.alias).to.match(/^fc-cli-dev-\d+$/)
        })
    })

    describe("updateAppUrls", () => {
        it("should POST webhook URLs to existing app", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/Applications/AP_abc`, (body: any) => {
                    expect(body.voiceUrl).to.equal("https://tunnel.ngrok.io/voice")
                    expect(body.smsUrl).to.equal("https://tunnel.ngrok.io/sms")
                    return true
                })
                .reply(200, {})

            await updateAppUrls("AP_abc", "https://tunnel.ngrok.io")
        })
    })

    describe("restoreAppUrls", () => {
        it("should convert null URLs to empty strings", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/Applications/AP_abc`, {
                    voiceUrl: "https://app.com/voice",
                    smsUrl: "",
                    statusCallbackUrl: "",
                    callConnectUrl: "",
                })
                .reply(200, {})

            await restoreAppUrls("AP_abc", {
                voiceUrl: "https://app.com/voice",
                smsUrl: null,
                statusCallbackUrl: null,
                callConnectUrl: null,
            })
        })
    })

    describe("deleteTempApp", () => {
        it("should DELETE the application", async () => {
            nock(BASE_URL)
                .delete(`/apiserver/Accounts/${accountId}/Applications/AP_abc`)
                .reply(204)

            await deleteTempApp("AP_abc")
        })

        it("should propagate API errors", async () => {
            nock(BASE_URL)
                .delete(`/apiserver/Accounts/${accountId}/Applications/AP_abc`)
                .reply(500, { message: "Server error" })

            try {
                await deleteTempApp("AP_abc")
                expect.fail("Should have thrown")
            } catch (err: unknown) {
                expect(err).to.be.an("error")
            }
        })
    })
})
