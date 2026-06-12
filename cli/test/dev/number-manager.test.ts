import { expect } from "chai"
import nock from "nock"
import { cred } from "../../src/credentials.js"
import { getNumber, assignNumber, restoreNumber } from "../../src/dev/number-manager.js"

const BASE_URL = "https://www.freeclimb.com"

describe("number-manager", () => {
    let accountId: string

    before(async () => {
        accountId = await cred.accountId
    })

    afterEach(() => {
        nock.cleanAll()
    })

    describe("getNumber", () => {
        it("should return number info with applicationId", async () => {
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(200, {
                    phoneNumberId: "PN_abc",
                    phoneNumber: "+15551234567",
                    applicationId: "AP_xyz",
                    alias: "My Number",
                })

            const info = await getNumber("PN_abc")
            expect(info.phoneNumberId).to.equal("PN_abc")
            expect(info.phoneNumber).to.equal("+15551234567")
            expect(info.applicationId).to.equal("AP_xyz")
            expect(info.alias).to.equal("My Number")
        })

        it("should return null applicationId for unassigned number", async () => {
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(200, {
                    phoneNumberId: "PN_abc",
                    phoneNumber: "+15551234567",
                })

            const info = await getNumber("PN_abc")
            expect(info.applicationId).to.be.null
        })
    })

    describe("assignNumber", () => {
        it("should return previous applicationId", async () => {
            // GET current number
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(200, {
                    phoneNumberId: "PN_abc",
                    phoneNumber: "+15551234567",
                    applicationId: "AP_old",
                })

            // POST assign
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`, {
                    applicationId: "AP_new",
                })
                .reply(200, { phoneNumberId: "PN_abc" })

            const previous = await assignNumber("PN_abc", "AP_new")
            expect(previous).to.equal("AP_old")
        })

        it("should return null when number was unassigned", async () => {
            nock(BASE_URL)
                .get(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(200, {
                    phoneNumberId: "PN_abc",
                    phoneNumber: "+15551234567",
                })

            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(200, {})

            const previous = await assignNumber("PN_abc", "AP_new")
            expect(previous).to.be.null
        })
    })

    describe("restoreNumber", () => {
        it("should assign back to previous app", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`, {
                    applicationId: "AP_old",
                })
                .reply(200, {})

            await restoreNumber("PN_abc", "AP_old")
            // No error means success
        })

        it("should send empty string to unassign when previous is null", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`, {
                    applicationId: "",
                })
                .reply(200, {})

            await restoreNumber("PN_abc", null)
        })

        it("should propagate API errors", async () => {
            nock(BASE_URL)
                .post(`/apiserver/Accounts/${accountId}/IncomingPhoneNumbers/PN_abc`)
                .reply(404, { message: "Not found" })

            try {
                await restoreNumber("PN_abc", "AP_old")
                expect.fail("Should have thrown")
            } catch (err: unknown) {
                expect(err).to.be.an("error")
            }
        })
    })
})
