import { expect } from "chai"
import nock from "nock"
import { FreeClimbApi } from "../src/freeclimb.js"

describe("FreeClimbApi class", () => {
    const errorResponse = { errorCause: "intentional" }
    const errorer = { error: (message: string, _: any) => console.error(message) }

    afterEach(() => {
        nock.cleanAll()
    })

    it("executes the custom callback", async () => {
        nock("https://www.freeclimb.com")
            .get("/apiserver/AutomatedTestEndpoint")
            .reply(400, errorResponse)

        let capturedError = ""
        await new FreeClimbApi("AutomatedTestEndpoint", false, errorer).apiCall(
            "GET",
            {},
            () => "this callback is never run",
            (err) => {
                capturedError = `Here is a custom error callback, and this is the error data:${JSON.stringify(err.response.data)}`
            }
        )
        expect(capturedError).to.contain(
            `Here is a custom error callback, and this is the error data:${JSON.stringify(errorResponse)}`
        )
    })

    it("executes the default callback", async () => {
        nock("https://www.freeclimb.com")
            .get("/apiserver/AutomatedTestEndpoint")
            .reply(400, errorResponse)

        let capturedError = ""
        const testErrorer = {
            error: (message: string, _: any) => {
                capturedError = message
            },
        }
        await new FreeClimbApi("AutomatedTestEndpoint", false, testErrorer).apiCall(
            "GET",
            {},
            () => "this callback is never run"
        )
        expect(capturedError).to.contain("errorCause")
    })
})
